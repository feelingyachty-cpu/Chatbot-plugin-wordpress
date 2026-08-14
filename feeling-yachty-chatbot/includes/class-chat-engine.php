<?php
/**
 * Local fleet receptionist. Quotes only live Suite 3.65.0 records.
 *
 * @package FeelingYachtyChatbot
 */

defined( 'ABSPATH' ) || exit;

class FY_Chatbot_Engine {

	public function __construct(
		private FY_Chatbot_Fleet_Client $fleet,
		private FY_Chatbot_Intent_Parser $parser
	) {}

	/**
	 * @param array<string, mixed> $prior
	 * @return array<string, mixed>
	 */
	public function reply( string $message, array $prior = array() ): array {
		$intent = $this->parser->parse( $message, $prior );
		$es     = $intent['lang'] === 'es';

		if ( $intent['city'] === 'unknown' ) {
			return $this->payload(
				$es
					? '¡Hola! Gracias por escribir a Feeling Yachty. ¿Buscas algo en Miami o en Panamá?'
					: 'Hi! So glad you reached out to Feeling Yachty. Are you looking in Miami or Panama?',
				$intent,
				array(),
				false
			);
		}

		$fleet_slug = $intent['city'] === 'panama' ? 'panama-yacht-rentals' : 'miami-yacht-rental';
		$yachts     = $this->fleet->yachts( $fleet_slug );
		if ( $yachts === array() ) {
			$yachts = $this->fleet->yachts();
		}

		$matches = $this->match( $yachts, $intent );
		$cards   = array_map( array( $this, 'card' ), array_slice( $matches, 0, 3 ) );

		if ( $intent['handoff'] ) {
			$phone = (string) get_option( 'fy_chatbot_phone', '+1-754-325-3827' );
			$text  = $es
				? 'Perfecto — te conecto con Karen de ventas. Te escribe enseguida. También puedes marcar o enviar SMS a ' . $phone . '.'
				: 'Okay — I’m connecting you with Karen on our sales team. She’ll be with you shortly. You can also call or text ' . $phone . '.';
			return $this->payload( $text, $intent, $cards, true );
		}

		if ( $cards === array() ) {
			$browse = $intent['city'] === 'panama'
				? 'https://feelingyachty.com/panama-yacht-rentals/'
				: ( $intent['pink'] ? 'https://feelingyachty.com/miami-pink-yacht-rentals/' : 'https://feelingyachty.com/miami-yacht-rental/' );
			$text   = $es
				? 'No encontré un yate en el fleet plugin (Feeling Yachty Suite 3.65.0) que coincida exactamente. ¿Me dices fecha, horas e invitados? Mientras tanto puedes ver el catálogo: ' . $browse
				: 'I don’t see an exact match in the live fleet (Feeling Yachty Suite 3.65.0). Tell me your date, hours, and guest count — or browse here: ' . $browse;
			return $this->payload( $text, $intent, array(), false );
		}

		$need = array();
		if ( empty( $intent['guests'] ) ) {
			$need[] = $es ? 'cuántos invitados' : 'guest count';
		}
		if ( empty( $intent['hours'] ) ) {
			$need[] = $es ? 'cuántas horas' : 'hours';
		}

		$lines = array();
		foreach ( $cards as $card ) {
			$lines[] = sprintf(
				'%s — %s ft, %s guests, from $%s (%s). %s',
				$card['title'],
				$card['size_ft'] ?: '—',
				$card['capacity_max'] ?: '—',
				number_format( (float) $card['display_price'] ),
				$card['duration_label'] ?: 'charter',
				$card['url']
			);
		}

		$intro = $es
			? 'Estas opciones salen del fleet plugin en vivo (Feeling Yachty Suite 3.65.0). No invento nombres ni precios:'
			: 'These picks are live from the fleet plugin (Feeling Yachty Suite 3.65.0). I only quote real names and prices:';

		$ask = '';
		if ( $need !== array() ) {
			$ask = $es
				? ' Para afinar, ¿me confirmas ' . implode( ' y ', $need ) . '?'
				: ' To tighten this, what’s your ' . implode( ' and ', $need ) . '?';
		} else {
			$ask = $es
				? ' ¿Cuál te gusta, o te paso con Karen?'
				: ' Which one do you like, or should I connect you with Karen?';
		}

		return $this->payload( $intro . "\n\n" . implode( "\n", $lines ) . $ask, $intent, $cards, false );
	}

	/**
	 * @param array<int, array<string, mixed>> $yachts
	 * @param array<string, mixed>             $intent
	 * @return array<int, array<string, mixed>>
	 */
	public function match( array $yachts, array $intent ): array {
		$scored = array();
		foreach ( $yachts as $yacht ) {
			if ( ! is_array( $yacht ) ) {
				continue;
			}
			if ( ( $yacht['status'] ?? 'publish' ) !== 'publish' ) {
				continue;
			}

			$score = 0;
			$cats  = array_map( 'strval', (array) ( $yacht['categories'] ?? array() ) );
			$city  = (string) ( $intent['city'] ?? 'unknown' );
			if ( $city === 'miami' && $this->in_city( $cats, 'miami' ) ) {
				$score += 20;
			} elseif ( $city === 'panama' && $this->in_city( $cats, 'panama' ) ) {
				$score += 20;
			} elseif ( $city !== 'unknown' && ! $this->in_city( $cats, $city ) ) {
				continue;
			}

			$cap = (int) ( $yacht['capacity_max'] ?? 0 );
			if ( ! empty( $intent['guests'] ) ) {
				if ( $cap > 0 && $cap < (int) $intent['guests'] ) {
					continue;
				}
				$score += 15;
			}

			$size = (int) ( $yacht['size_ft'] ?? 0 );
			if ( ! empty( $intent['size_min'] ) && $size && $size < (int) $intent['size_min'] ) {
				continue;
			}
			if ( ! empty( $intent['size_max'] ) && $size && $size > (int) $intent['size_max'] ) {
				continue;
			}
			if ( ! empty( $intent['size_min'] ) ) {
				$score += 10;
			}

			if ( ! empty( $intent['pink'] ) ) {
				if ( empty( $yacht['is_pink'] ) ) {
					continue;
				}
				$score += 25;
			}

			if ( ! empty( $intent['free_hour'] ) && ! empty( $yacht['is_free_hour'] ) ) {
				$score += 10;
			}

			$price = $this->price_for_hours( $yacht, $intent['hours'] ?? null );
			if ( ! empty( $intent['budget'] ) && $price && $price > (float) $intent['budget'] * 1.15 ) {
				continue;
			}

			$query = strtolower( (string) ( $intent['query'] ?? '' ) );
			$hay   = strtolower(
				implode(
					' ',
					array(
						(string) ( $yacht['title'] ?? '' ),
						(string) ( $yacht['brand'] ?? '' ),
						(string) ( $yacht['model'] ?? '' ),
						(string) ( $yacht['search_terms'] ?? '' ),
						implode( ' ', (array) ( $yacht['tags'] ?? array() ) ),
					)
				)
			);
			if ( $query !== '' ) {
				foreach ( preg_split( '/\s+/', $query ) ?: array() as $word ) {
					if ( $word !== '' && str_contains( $hay, $word ) ) {
						$score += 8;
					}
				}
			}

			$yacht['_score'] = $score;
			$yacht['_price'] = $price;
			$scored[]        = $yacht;
		}

		usort(
			$scored,
			static function ( $a, $b ) {
				return ( (int) ( $b['_score'] ?? 0 ) ) <=> ( (int) ( $a['_score'] ?? 0 ) );
			}
		);

		return $scored;
	}

	/**
	 * @param array<string, mixed> $yacht
	 */
	public function price_for_hours( array $yacht, mixed $hours ): ?float {
		$pricing = (array) ( $yacht['pricing'] ?? array() );
		if ( $hours ) {
			$label = ( (float) $hours === floor( (float) $hours ) )
				? ( (int) $hours ) . ' Hours'
				: (string) $hours . ' Hours';
			foreach ( $pricing as $row ) {
				if ( ! is_array( $row ) ) {
					continue;
				}
				$duration = (string) ( $row['duration'] ?? '' );
				if ( stripos( $duration, (string) (int) $hours ) === 0 || strcasecmp( $duration, $label ) === 0 ) {
					if ( isset( $row['price'] ) && is_numeric( $row['price'] ) ) {
						return (float) $row['price'];
					}
				}
			}
		}
		if ( isset( $yacht['price'] ) && is_numeric( $yacht['price'] ) ) {
			$hourly = (float) $yacht['price'];
			return $hours ? $hourly * (float) $hours : $hourly;
		}
		return null;
	}

	/**
	 * @param array<int, string> $categories
	 */
	private function in_city( array $categories, string $city ): bool {
		$needle = $city === 'panama' ? 'panama' : 'miami';
		foreach ( $categories as $cat ) {
			if ( str_contains( strtolower( (string) $cat ), $needle ) ) {
				return true;
			}
		}
		return $categories === array();
	}

	/**
	 * @param array<string, mixed> $yacht
	 * @return array<string, mixed>
	 */
	private function card( array $yacht ): array {
		$price = $yacht['_price'] ?? $this->price_for_hours( $yacht, null );
		return array(
			'id'             => (int) ( $yacht['id'] ?? 0 ),
			'title'          => (string) ( $yacht['title'] ?? '' ),
			'size_ft'        => (int) ( $yacht['size_ft'] ?? 0 ),
			'capacity_max'   => (int) ( $yacht['capacity_max'] ?? 0 ),
			'brand'          => (string) ( $yacht['brand'] ?? '' ),
			'model'          => (string) ( $yacht['model'] ?? '' ),
			'is_pink'        => ! empty( $yacht['is_pink'] ),
			'is_free_hour'   => ! empty( $yacht['is_free_hour'] ),
			'image_url'      => (string) ( $yacht['image_url'] ?? '' ),
			'url'            => (string) ( $yacht['product_url'] ?? $yacht['button_url'] ?? '' ),
			'display_price'  => $price,
			'duration_label' => (string) ( $yacht['duration_label'] ?? '' ),
			'source'         => 'feeling-yachty-suite-3.65.0',
		);
	}

	/**
	 * @param array<string, mixed>             $intent
	 * @param array<int, array<string, mixed>> $cards
	 * @return array<string, mixed>
	 */
	private function payload( string $reply, array $intent, array $cards, bool $handoff ): array {
		return array(
			'reply'   => $reply,
			'handoff' => $handoff,
			'city'    => $intent['city'],
			'lang'    => $intent['lang'],
			'lead'    => array(
				'guests' => $intent['guests'],
				'hours'  => $intent['hours'],
				'pink'   => $intent['pink'],
				'budget' => $intent['budget'],
			),
			'yachts'  => $cards,
			'source'  => 'feeling-yachty-suite-3.65.0',
			'intent'  => $intent,
		);
	}
}
