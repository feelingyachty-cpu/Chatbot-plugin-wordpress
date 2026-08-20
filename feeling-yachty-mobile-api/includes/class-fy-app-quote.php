<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Trip total → today’s payment → due at the dock.
 * Dock is boat − hourly deposit − % boat deposit. Crew is not credited.
 * Totals come from Suite pricing rows. Never hourly × hours when a row exists.
 */
class FY_App_Quote {

	const DEPOSIT_RATE = 0.5;

	public static function init() {
		// Suite 3.73.5+ is the source of truth for fuel, dock math, and the
		// product card. Do not rewrite Suite settings or replace its JS.
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue' ), 30 );
		add_action( 'save_post_fy_yacht', array( __CLASS__, 'sync_product' ), 40, 1 );
		add_filter( 'woocommerce_add_cart_item_data', array( __CLASS__, 'credit_cart_booking' ), 30, 3 );
		add_action( 'woocommerce_checkout_create_order_line_item', array( __CLASS__, 'credit_order_balance' ), 30, 4 );
		add_action( 'wp_loaded', array( __CLASS__, 'replace_cart_rows' ), 100 );
	}

	/** No-op. Suite owns fleet fuel. Kept so leftover hooks do not fatal. */
	public static function apply_fleet_fuel_rate() {}

	/** No-op. Suite owns the product card. Kept so leftover filters do not swap JS. */
	public static function swap_product_express( $src, $handle ) {
		return $src;
	}

	public static function enqueue() {
		// Do not load dock-math.js. It reads "Due at the dock" as today's
		// charge and rewrites a correct Suite card.
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

	/**
	 * pay_now is today’s Woo / crew+deposit charge when it fits inside the boat total.
	 * Dock credits deposits only.
	 */
	public static function suite_pay_now( $trip, $hours, $yacht_id = 0 ) {
		$trip  = (float) $trip;
		$hours = (float) $hours;
		if ( $trip <= 0 || $hours <= 0 ) {
			return 0.0;
		}
		$crew_over  = class_exists( 'FY_Fleet_Settings' ) ? FY_Fleet_Settings::get_crew_rate() : 100;
		$crew_under = class_exists( 'FY_Fleet_Settings' ) ? FY_Fleet_Settings::get_crew_rate_under() : 75;
		$fuel_over  = class_exists( 'FY_Fleet_Settings' ) ? FY_Fleet_Settings::get_fuel_rate() : 50;
		$fuel_under = class_exists( 'FY_Fleet_Settings' ) ? FY_Fleet_Settings::get_fuel_rate_under() : 25;
		$fuel_thr   = class_exists( 'FY_Fleet_Settings' ) ? FY_Fleet_Settings::get_fuel_threshold() : 800;
		$dep_thr    = class_exists( 'FY_Fleet_Settings' ) ? FY_Fleet_Settings::get_charter_deposit_threshold() : 1400;
		$dep_pct    = class_exists( 'FY_Fleet_Settings' ) ? FY_Fleet_Settings::get_charter_deposit_pct() : 20;
		$crew_lock  = $yacht_id ? get_post_meta( $yacht_id, '_fy_crew_rate', true ) : '';
		$fuel_lock  = $yacht_id ? get_post_meta( $yacht_id, '_fy_fuel_rate', true ) : '';
		$crew       = ( '' !== $crew_lock && null !== $crew_lock )
			? max( 0, (float) $crew_lock )
			: ( $dep_thr > 0 && $trip <= $dep_thr ? $crew_under : $crew_over );
		$fuel       = ( '' !== $fuel_lock && null !== $fuel_lock )
			? max( 0, (float) $fuel_lock )
			: ( $fuel_thr > 0 && $trip <= $fuel_thr ? $fuel_under : $fuel_over );
		$now        = round( ( $crew + $fuel ) * $hours, 2 );
		if ( $dep_thr > 0 && $dep_pct > 0 && $trip > $dep_thr ) {
			$now = round( $now + ( $trip * $dep_pct / 100 ), 2 );
		}
		return $now;
	}

	/** Hourly boat deposit + percent boat deposit credited against the boat. */
	public static function dock_credit( $trip, $hours, $yacht_id = 0 ) {
		$trip  = (float) $trip;
		$hours = (float) $hours;
		if ( $trip <= 0 || $hours <= 0 ) {
			return 0.0;
		}
		$fuel_over  = class_exists( 'FY_Fleet_Settings' ) ? FY_Fleet_Settings::get_fuel_rate() : 50;
		$fuel_under = class_exists( 'FY_Fleet_Settings' ) ? FY_Fleet_Settings::get_fuel_rate_under() : 25;
		$fuel_thr   = class_exists( 'FY_Fleet_Settings' ) ? FY_Fleet_Settings::get_fuel_threshold() : 800;
		$dep_thr    = class_exists( 'FY_Fleet_Settings' ) ? FY_Fleet_Settings::get_charter_deposit_threshold() : 1400;
		$dep_pct    = class_exists( 'FY_Fleet_Settings' ) ? FY_Fleet_Settings::get_charter_deposit_pct() : 20;
		$fuel_lock  = $yacht_id ? get_post_meta( $yacht_id, '_fy_fuel_rate', true ) : '';
		$hourly     = ( '' !== $fuel_lock && null !== $fuel_lock )
			? max( 0, (float) $fuel_lock )
			: ( $fuel_thr > 0 && $trip <= $fuel_thr ? $fuel_under : $fuel_over );
		$hourly_total = round( $hourly * $hours, 2 );
		$pct_total    = ( $dep_thr > 0 && $dep_pct > 0 && $trip > $dep_thr )
			? round( $trip * $dep_pct / 100, 2 )
			: 0.0;
		return round( max( 0, $trip - $hourly_total - $pct_total ), 2 );
	}

	public static function split( $trip, $paid_today = null, $hours = 0, $yacht_id = 0 ) {
		$trip  = round( (float) $trip, 2 );
		$paid  = null === $paid_today ? null : round( (float) $paid_today, 2 );
		$suite = $hours > 0 ? self::suite_pay_now( $trip, $hours, $yacht_id ) : 0.0;
		$fits  = static function ( $amount ) use ( $trip ) {
			return $amount > 0 && $amount <= $trip + 0.05;
		};
		if ( null !== $paid && $fits( $paid ) ) {
			$deposit = $paid;
		} elseif ( $fits( $suite ) ) {
			$deposit = $suite;
		} else {
			$deposit = round( $trip * self::DEPOSIT_RATE, 2 );
		}
		$dock = $hours > 0
			? self::dock_credit( $trip, $hours, $yacht_id )
			: round( max( 0, $trip - $deposit ), 2 );
		return array(
			'trip_total'   => $trip,
			'pay_now'      => $deposit,
			'due_at_dock'  => $dock,
			'deposit_rate' => self::DEPOSIT_RATE,
		);
	}

	public static function product_id_for_yacht( $yacht_id ) {
		$product_id = (int) get_post_meta( $yacht_id, '_fy_product_id', true );
		if ( $product_id ) {
			return $product_id;
		}
		if ( ! function_exists( 'get_posts' ) ) {
			return 0;
		}
		$linked = get_posts(
			array(
				'post_type'      => 'product',
				'post_status'    => 'publish',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'meta_key'       => '_fy_yacht_id',
				'meta_value'     => $yacht_id,
			)
		);
		return $linked ? (int) $linked[0] : 0;
	}

	public static function woo_pay_now( $yacht_id, $hours ) {
		if ( $hours < 1 || ! function_exists( 'wc_get_product' ) ) {
			return null;
		}
		$product_id = self::product_id_for_yacht( $yacht_id );
		if ( ! $product_id ) {
			return null;
		}
		$product = wc_get_product( $product_id );
		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return null;
		}
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
			if ( self::hours( $slug ) !== (int) $hours ) {
				continue;
			}
			$price = (float) $variation->get_regular_price();
			return $price > 0 ? $price : null;
		}
		return null;
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
		$money             = self::split( $pick['price'], self::woo_pay_now( $yacht_id, $pick['hours'] ), $pick['hours'], $yacht_id );
		$money['duration'] = $pick['duration'];
		$money['hours']    = $pick['hours'];
		$money['yacht_id'] = (int) $yacht_id;
		return $money;
	}

	public static function table( $yacht_id ) {
		$table = array();
		foreach ( self::rows( $yacht_id ) as $row ) {
			$money                           = self::split( $row['price'], self::woo_pay_now( $yacht_id, $row['hours'] ), $row['hours'], $yacht_id );
			$table[ (string) $row['hours'] ] = array(
				'duration'    => $row['duration'],
				'trip_total'  => $money['trip_total'],
				'pay_now'     => $money['pay_now'],
				'due_at_dock' => $money['due_at_dock'],
			);
		}
		return $table;
	}

	public static function money( $amount ) {
		return '$' . number_format( (float) $amount, 0 );
	}

	/**
	 * Suite already prices variations as crew + fuel (+ reservation deposit).
	 * Do not rewrite those to a 50% guess — Coco 4h $700 is the real today charge.
	 */
	public static function sync_product( $yacht_id ) {
		return 0;
	}

	public static function credit_cart_booking( $cart_item_data, $product_id = 0, $variation_id = 0 ) {
		if ( empty( $cart_item_data['fy_booking'] ) || ! is_array( $cart_item_data['fy_booking'] ) ) {
			return $cart_item_data;
		}
		$booking = $cart_item_data['fy_booking'];
		$boat    = isset( $booking['charter'] ) ? (float) $booking['charter'] : 0;
		$deposit = isset( $booking['deposit'] ) ? (float) $booking['deposit'] : 0;
		$addons  = isset( $booking['addons_total'] ) ? (float) $booking['addons_total'] : 0;
		if ( $boat <= 0 ) {
			return $cart_item_data;
		}
		$ratio      = class_exists( 'FY_Fleet_Settings' ) ? FY_Fleet_Settings::get_addon_deposit_ratio() : 0.5;
		$addons_now = round( $addons * $ratio, 2 );
		$toward     = max( 0, $deposit - $addons_now );
		$booking['total']             = round( $boat + $addons, 2 );
		$booking['balance']           = round( max( 0, $boat - $toward ) + max( 0, $addons - $addons_now ), 2 );
		$cart_item_data['fy_booking'] = $booking;
		return $cart_item_data;
	}

	public static function credit_order_balance( $item, $cart_item_key, $values, $order ) {
		$boat = (float) $item->get_meta( '_fy_booking_charge' );
		if ( $boat <= 0 ) {
			return;
		}
		$deposit      = (float) $item->get_meta( '_fy_deposit' );
		$addons_total = 0.0;
		$addons_now   = 0.0;
		if ( ! empty( $values['fy_addons'] ) && is_array( $values['fy_addons'] ) ) {
			$addons_total = isset( $values['fy_addons']['total'] ) ? (float) $values['fy_addons']['total'] : 0;
			if ( isset( $values['fy_addons']['now'] ) ) {
				$addons_now = (float) $values['fy_addons']['now'];
			} elseif ( class_exists( 'FY_Fleet_Settings' ) ) {
				$addons_now = round( $addons_total * FY_Fleet_Settings::get_addon_deposit_ratio(), 2 );
			} else {
				$addons_now = round( $addons_total * 0.5, 2 );
			}
		}
		$toward_boat = max( 0, $deposit - $addons_now );
		$balance     = round( max( 0, $boat - $toward_boat ) + max( 0, $addons_total - $addons_now ), 2 );
		$item->update_meta_data( '_fy_balance', $balance );
		$item->update_meta_data( '_fy_charter_total', round( $boat + $addons_total, 2 ) );
		if ( function_exists( 'wc_price' ) ) {
			$item->update_meta_data( __( 'Balance due at the dock', 'fy-fleet' ), wp_strip_all_tags( wc_price( $balance ) ) );
		}
	}

	public static function replace_cart_rows() {
		// Suite prints boat − today. Do not steal those rows.
	}

	public static function cart_split() {
		$totals = array(
			'charter' => 0.0,
			'deposit' => 0.0,
			'balance' => 0.0,
			'count'   => 0,
		);
		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			return $totals;
		}
		foreach ( WC()->cart->get_cart() as $item ) {
			if ( ! empty( $item['fy_booking'] ) && is_array( $item['fy_booking'] ) ) {
				$booking            = $item['fy_booking'];
				$totals['charter'] += isset( $booking['total'] ) ? (float) $booking['total'] : 0;
				$totals['deposit'] += isset( $booking['deposit'] ) ? (float) $booking['deposit'] : 0;
				$totals['balance'] += isset( $booking['balance'] ) ? (float) $booking['balance'] : 0;
				$totals['count']++;
				continue;
			}
			$product_id = ! empty( $item['product_id'] ) ? (int) $item['product_id'] : 0;
			$yacht_id   = $product_id ? (int) get_post_meta( $product_id, '_fy_yacht_id', true ) : 0;
			if ( ! $yacht_id ) {
				continue;
			}
			$deposit = isset( $item['line_total'] ) ? (float) $item['line_total'] : 0;
			$slug    = '';
			if ( ! empty( $item['variation'] ) && is_array( $item['variation'] ) ) {
				foreach ( $item['variation'] as $key => $value ) {
					if ( false !== stripos( (string) $key, 'charter-duration' ) && '' !== (string) $value ) {
						$slug = (string) $value;
						break;
					}
				}
			}
			$boat = 0.0;
			if ( $slug && class_exists( 'FY_Fleet_Pricing' ) ) {
				$row  = FY_Fleet_Pricing::row_for_duration_slug( $yacht_id, $slug );
				$boat = $row && isset( $row['price'] ) ? (float) $row['price'] : 0;
			}
			if ( $boat <= 0 ) {
				continue;
			}
			$addons_total = ! empty( $item['fy_addons']['total'] ) ? (float) $item['fy_addons']['total'] : 0.0;
			$addons_now   = 0.0;
			if ( $addons_total > 0 ) {
				$addons_now = class_exists( 'FY_Fleet_Settings' )
					? round( $addons_total * FY_Fleet_Settings::get_addon_deposit_ratio(), 2 )
					: round( $addons_total * 0.5, 2 );
			}
			$toward_boat        = max( 0, $deposit - $addons_now );
			$totals['charter'] += $boat + $addons_total;
			$totals['deposit'] += $deposit;
			$totals['balance'] += max( 0, $boat - $toward_boat ) + max( 0, $addons_total - $addons_now );
			$totals['count']++;
		}
		return $totals;
	}

	public static function balance_row() {
		$totals = self::cart_split();
		if ( $totals['count'] < 1 ) {
			return;
		}
		?>
		<tr class="fy-charter-total-row">
			<th><?php esc_html_e( 'Full charter price', 'fy-app' ); ?></th>
			<td data-title="<?php esc_attr_e( 'Full charter price', 'fy-app' ); ?>">
				<?php echo wp_kses_post( wc_price( $totals['charter'] ) ); ?>
			</td>
		</tr>
		<?php if ( $totals['balance'] > 0 ) : ?>
		<tr class="fy-balance-row">
			<th><?php esc_html_e( 'Balance due at the dock', 'fy-app' ); ?></th>
			<td data-title="<?php esc_attr_e( 'Balance due at the dock', 'fy-app' ); ?>">
				<strong><?php echo wp_kses_post( wc_price( $totals['balance'] ) ); ?></strong>
				<small style="display:block;opacity:.75"><?php esc_html_e( 'Today’s payment is already subtracted from this boat balance.', 'fy-app' ); ?></small>
			</td>
		</tr>
		<?php endif; ?>
		<?php
	}
}
