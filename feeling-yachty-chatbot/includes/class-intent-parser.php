<?php
/**
 * Pulls city, language, guests, hours, and vibe out of a chat message.
 *
 * @package FeelingYachtyChatbot
 */

defined( 'ABSPATH' ) || exit;

class FY_Chatbot_Intent_Parser {

	/**
	 * @param array<string, mixed> $prior
	 * @return array<string, mixed>
	 */
	public function parse( string $message, array $prior = array() ): array {
		$text = trim( $message );
		$low  = strtolower( $text );

		$intent = array_merge(
			array(
				'city'       => 'unknown',
				'lang'       => 'en',
				'guests'     => null,
				'hours'      => null,
				'pink'       => null,
				'size_min'   => null,
				'size_max'   => null,
				'budget'     => null,
				'free_hour'  => null,
				'query'      => '',
				'handoff'    => false,
				'yacht_name' => '',
			),
			$prior
		);

		$intent['lang'] = $this->language( $text, $intent['lang'] );
		$intent['city'] = $this->city( $low, (string) $intent['city'] );

		if ( preg_match( '/\b(\d{1,2})\s*(?:guests?|people|pax|personas|invitados?)\b/u', $low, $m ) ) {
			$intent['guests'] = (int) $m[1];
		} elseif ( preg_match( '/\b(?:for|para)\s+(\d{1,2})\b/u', $low, $m ) ) {
			$n = (int) $m[1];
			if ( $n >= 2 && $n <= 20 ) {
				$intent['guests'] = $n;
			}
		}

		if ( preg_match( '/\b(\d(?:\.\d)?)\s*(?:hours?|hrs?|horas?)\b/u', $low, $m ) ) {
			$intent['hours'] = (float) $m[1];
		}

		if ( preg_match( '/\b(\d{2,3})\s*(?:ft|feet|pies?)\b/u', $low, $m ) ) {
			$ft = (int) $m[1];
			$intent['size_min'] = max( 0, $ft - 5 );
			$intent['size_max'] = $ft + 5;
		}

		if ( preg_match( '/\$\s*([0-9]{3,5})\b/u', $low, $m ) ) {
			$intent['budget'] = (int) $m[1];
		}

		if ( preg_match( '/\bpink|rosa\b/u', $low ) ) {
			$intent['pink'] = true;
		}

		if ( preg_match( '/\bfree hour|hora gratis|1 hour free\b/u', $low ) ) {
			$intent['free_hour'] = true;
		}

		if ( preg_match( '/\b(send me options|give me options|connect me|hablar con|agente|karen|karin|call me|ll[aá]mame)\b/u', $low ) ) {
			$intent['handoff'] = true;
		}

		$intent['query'] = $this->search_query( $low );
		return $intent;
	}

	public function language( string $raw, string $fallback = 'en' ): string {
		$low         = strtolower( $raw );
		$has_es_char = (bool) preg_match( '/[áéíóúñü¿¡]/u', $raw );
		$es          = preg_match_all( '/\b(hola|buenas|gracias|quiero|quisiera|necesito|alquiler|alquilar|yate|yates|reservar|personas|invitados|cu[aá]nto|disponible|espa[nñ]ol|me gustar[ií]a)\b/u', $low );
		$en          = preg_match_all( '/\b(hi|hello|hey|thanks|please|want|need|yacht|charter|guests|people|price|available|hours)\b/u', $low );

		if ( $has_es_char || $es >= 1 ) {
			return 'es';
		}
		if ( $en >= 1 ) {
			return 'en';
		}
		return in_array( $fallback, array( 'en', 'es' ), true ) ? $fallback : 'en';
	}

	public function city( string $low, string $prior = 'unknown' ): string {
		if ( in_array( $prior, array( 'miami', 'panama' ), true ) ) {
			$switch_miami  = (bool) preg_match( '/\bmiami|florida|brickell|biscayne|fort lauderdale|fll\b/u', $low );
			$switch_panama = (bool) preg_match( '/\bpanama|panam[aá]|amador|taboga|san blas\b/u', $low );
			if ( $switch_miami && ! $switch_panama ) {
				return 'miami';
			}
			if ( $switch_panama && ! $switch_miami ) {
				return 'panama';
			}
			return $prior;
		}

		$miami  = (bool) preg_match( '/\bmiami|florida|brickell|key biscayne|miami beach|fort lauderdale|fll\b/u', $low );
		$panama = (bool) preg_match( '/\bpanama|panam[aá]|amador|taboga|san blas|contadora\b/u', $low );
		if ( $miami && ! $panama ) {
			return 'miami';
		}
		if ( $panama && ! $miami ) {
			return 'panama';
		}
		return 'unknown';
	}

	private function search_query( string $low ): string {
		$stop = array( 'the', 'and', 'for', 'with', 'looking', 'want', 'need', 'hola', 'quiero', 'un', 'una', 'para' );
		$bits = preg_split( '/\s+/', $low ) ?: array();
		$keep = array();
		foreach ( $bits as $bit ) {
			$bit = trim( $bit, ".,!?\"'" );
			if ( strlen( $bit ) < 3 || in_array( $bit, $stop, true ) ) {
				continue;
			}
			if ( preg_match( '/^(yacht|yachts|boat|boats|charter|rental|alquiler|yate|yates)$/u', $bit ) ) {
				continue;
			}
			$keep[] = $bit;
		}
		return implode( ' ', array_slice( $keep, 0, 8 ) );
	}
}
