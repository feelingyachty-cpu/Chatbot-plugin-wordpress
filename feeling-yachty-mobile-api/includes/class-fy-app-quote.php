<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Trip total → deposit → due at the dock.
 * Totals come from Suite pricing rows. Never hourly × hours when a row exists.
 */
class FY_App_Quote {

	const DEPOSIT_RATE = 0.5;

	public static function init() {
		add_action( 'woocommerce_before_add_to_cart_button', array( __CLASS__, 'product_breakdown' ), 5 );
		add_action( 'save_post_fy_yacht', array( __CLASS__, 'sync_product' ), 40, 1 );
	}

	public static function hours( $duration ) {
		if ( preg_match( '/(\d+)/', (string) $duration, $match ) ) {
			return (int) $match[1];
		}
		return 0;
	}

	public static function slug( $duration ) {
		$hours = self::hours( $duration );
		if ( $hours < 1 ) {
			return sanitize_title( (string) $duration );
		}
		return 1 === $hours ? '1-hour' : $hours . '-hours';
	}

	public static function rows( $yacht_id ) {
		$raw = get_post_meta( $yacht_id, '_fy_pricing', true );
		$out = array();
		if ( ! is_array( $raw ) ) {
			return $out;
		}
		foreach ( $raw as $row ) {
			if ( ! isset( $row['type'] ) || 'price' !== $row['type'] || ! isset( $row['price'] ) ) {
				continue;
			}
			$out[] = array(
				'duration' => isset( $row['duration'] ) ? (string) $row['duration'] : '',
				'price'    => (float) $row['price'],
				'hours'    => self::hours( isset( $row['duration'] ) ? $row['duration'] : '' ),
			);
		}
		return $out;
	}

	public static function split( $trip ) {
		$trip    = round( (float) $trip, 2 );
		$deposit = round( $trip * self::DEPOSIT_RATE, 2 );
		return array(
			'trip_total'   => $trip,
			'pay_now'      => $deposit,
			'due_at_dock'  => round( $trip - $deposit, 2 ),
			'deposit_rate' => self::DEPOSIT_RATE,
		);
	}

	public static function for_duration( $yacht_id, $duration = '' ) {
		$rows = self::rows( $yacht_id );
		if ( ! $rows ) {
			return null;
		}
		$hours = self::hours( $duration );
		$pick  = $rows[0];
		foreach ( $rows as $row ) {
			if ( $hours && $row['hours'] === $hours ) {
				$pick = $row;
				break;
			}
		}
		if ( ! $hours ) {
			foreach ( $rows as $row ) {
				if ( $row['price'] < $pick['price'] ) {
					$pick = $row;
				}
			}
		}
		$money               = self::split( $pick['price'] );
		$money['duration']   = $pick['duration'];
		$money['hours']      = $pick['hours'];
		$money['yacht_id']   = (int) $yacht_id;
		return $money;
	}

	public static function table( $yacht_id ) {
		$table = array();
		foreach ( self::rows( $yacht_id ) as $row ) {
			$money = self::split( $row['price'] );
			$table[ (string) $row['hours'] ] = array(
				'duration'    => $row['duration'],
				'trip_total'  => $money['trip_total'],
				'pay_now'     => $money['pay_now'],
				'due_at_dock' => $money['due_at_dock'],
			);
		}
		return $table;
	}

	public static function product_breakdown() {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return;
		}
		$product_id = get_the_ID();
		$yacht_id   = (int) get_post_meta( $product_id, '_fy_yacht_id', true );
		if ( ! $yacht_id ) {
			$linked = get_posts(
				array(
					'post_type'      => 'fy_yacht',
					'post_status'    => 'publish',
					'posts_per_page' => 1,
					'fields'         => 'ids',
					'meta_key'       => '_fy_product_id',
					'meta_value'     => $product_id,
				)
			);
			$yacht_id = $linked ? (int) $linked[0] : 0;
		}
		if ( ! $yacht_id ) {
			return;
		}
		$table = self::table( $yacht_id );
		if ( ! $table ) {
			return;
		}
		$first = reset( $table );
		echo '<div class="fy-dock-math" data-fy-quotes="' . esc_attr( wp_json_encode( $table ) ) . '">';
		echo '<p class="fy-dock-trip"><strong>' . esc_html__( 'Trip total', 'fy-app' ) . '</strong> <span data-fy-trip>' . esc_html( self::money( $first['trip_total'] ) ) . '</span></p>';
		echo '<p class="fy-dock-now"><strong>' . esc_html__( 'Pay now to book', 'fy-app' ) . '</strong> <span data-fy-now>' . esc_html( self::money( $first['pay_now'] ) ) . '</span></p>';
		echo '<p class="fy-dock-dock"><strong>' . esc_html__( 'Due at the dock', 'fy-app' ) . '</strong> <span data-fy-dock>' . esc_html( self::money( $first['due_at_dock'] ) ) . '</span></p>';
		echo '<p class="fy-dock-note">' . esc_html__( 'Hours change the trip total. Half is charged today, half is due at the dock. Add-ons use the same split.', 'fy-app' ) . '</p>';
		echo '</div>';
		echo '<style>.fy-dock-math{margin:16px 0;padding:14px 16px;border-radius:16px;background:#12263a;color:#fff}.fy-dock-math p{margin:0 0 6px}.fy-dock-note{opacity:.8;font-size:13px}</style>';
		echo '<script>(function(){var box=document.querySelector(".fy-dock-math");if(!box)return;var quotes=JSON.parse(box.getAttribute("data-fy-quotes")||"{}");function hoursFrom(v){var m=String(v||"").match(/(\\d+)/);return m?m[1]:"";}function money(n){return "$"+Math.round(Number(n)).toLocaleString("en-US");}function paint(h){var q=quotes[h];if(!q)return;var t=box.querySelector("[data-fy-trip]");var n=box.querySelector("[data-fy-now]");var d=box.querySelector("[data-fy-dock]");if(t)t.textContent=money(q.trip_total);if(n)n.textContent=money(q.pay_now);if(d)d.textContent=money(q.due_at_dock);}function read(){var sel=document.querySelector("select[name=attribute_pa_charter-duration],select#pa_charter-duration");paint(hoursFrom(sel&&sel.value));}document.addEventListener("change",function(e){if(e.target&&/charter-duration/.test(e.target.name||e.target.id||""))read();});if(window.jQuery){jQuery(document.body).on("found_variation show_variation",function(ev,v){if(!v||!v.attributes)return;paint(hoursFrom(v.attributes["attribute_pa_charter-duration"]||""));});}read();})();</script>';
	}

	public static function money( $amount ) {
		return '$' . number_format( (float) $amount, 0 );
	}

	/**
	 * Repair Woo variations that still use the cloned $175/hr table ($525 for 3 hours).
	 */
	public static function sync_product( $yacht_id ) {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return 0;
		}
		$product_id = (int) get_post_meta( $yacht_id, '_fy_product_id', true );
		if ( ! $product_id ) {
			return 0;
		}
		$product = wc_get_product( $product_id );
		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return 0;
		}
		$table = self::table( $yacht_id );
		if ( ! $table ) {
			return 0;
		}
		$changed = 0;
		foreach ( $product->get_children() as $variation_id ) {
			$variation = wc_get_product( $variation_id );
			if ( ! $variation ) {
				continue;
			}
			$slug = $variation->get_attribute( 'pa_charter-duration' );
			if ( ! $slug ) {
				$attrs = $variation->get_attributes();
				$slug  = isset( $attrs['pa_charter-duration'] ) ? $attrs['pa_charter-duration'] : '';
			}
			$hours = self::hours( $slug );
			if ( ! $hours || empty( $table[ (string) $hours ] ) ) {
				continue;
			}
			$current = (float) $variation->get_regular_price();
			$target  = (float) $table[ (string) $hours ]['pay_now'];
			$cloned  = ( 3 === $hours && abs( $current - 525 ) < 0.05 ) || ( 4 === $hours && abs( $current - 700 ) < 0.05 );
			$stale   = $current > ( (float) $table[ (string) $hours ]['trip_total'] ) + 0.05;
			if ( ! $cloned && ! $stale && abs( $current - $target ) < 0.05 ) {
				continue;
			}
			if ( ! $cloned && ! $stale ) {
				continue;
			}
			$variation->set_regular_price( wc_format_decimal( $target, 2 ) );
			$variation->set_price( wc_format_decimal( $target, 2 ) );
			$variation->save();
			$changed++;
		}
		return $changed;
	}
}
