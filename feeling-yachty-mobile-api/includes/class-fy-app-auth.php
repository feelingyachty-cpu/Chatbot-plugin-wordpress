<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * WooCommerce customer login for the mobile app.
 * Tokens live in user meta. Profile photo uses Suite `_fy_avatar_id`.
 */
class FY_App_Auth {

	const TOKEN_META = '_fy_app_token_sha';
	const TOKEN_EXP  = '_fy_app_token_exp';
	const SETTINGS   = '_fy_app_settings';

	public static function permission( $request ) {
		return (bool) self::user_id( $request );
	}

	public static function user_id( $request ) {
		$header = $request->get_header( 'authorization' );
		if ( ! $header && function_exists( 'getallheaders' ) ) {
			$headers = getallheaders();
			$header  = isset( $headers['Authorization'] ) ? $headers['Authorization'] : '';
		}
		if ( ! $header || ! preg_match( '/Bearer\s+(.+)/i', $header, $m ) ) {
			return 0;
		}
		$hash  = hash( 'sha256', trim( $m[1] ) );
		$users = get_users(
			array(
				'meta_key'   => self::TOKEN_META,
				'meta_value' => $hash,
				'number'     => 1,
				'fields'     => 'ID',
			)
		);
		if ( empty( $users ) ) {
			return 0;
		}
		$user_id = (int) $users[0];
		$exp     = (int) get_user_meta( $user_id, self::TOKEN_EXP, true );
		if ( $exp && $exp < time() ) {
			return 0;
		}
		return $user_id;
	}

	public static function register( $request ) {
		$params = self::params( $request );
		$email  = isset( $params['email'] ) ? sanitize_email( $params['email'] ) : '';
		$pass   = isset( $params['password'] ) ? (string) $params['password'] : '';
		$first  = isset( $params['first_name'] ) ? sanitize_text_field( $params['first_name'] ) : '';
		$last   = isset( $params['last_name'] ) ? sanitize_text_field( $params['last_name'] ) : '';
		$phone  = isset( $params['phone'] ) ? sanitize_text_field( $params['phone'] ) : '';
		$region = self::region( isset( $params['region'] ) ? $params['region'] : '' );

		if ( ! is_email( $email ) ) {
			return new WP_Error( 'fy_app_email', __( 'Enter a valid email.', 'fy-app' ), array( 'status' => 400 ) );
		}
		if ( strlen( $pass ) < 8 ) {
			return new WP_Error( 'fy_app_password', __( 'Password must be at least 8 characters.', 'fy-app' ), array( 'status' => 400 ) );
		}
		if ( email_exists( $email ) ) {
			return new WP_Error( 'fy_app_exists', __( 'That email already has a Feeling Yachty account. Log in instead.', 'fy-app' ), array( 'status' => 409 ) );
		}

		$username = self::username_from_email( $email );
		$user_id  = wp_insert_user(
			array(
				'user_login'   => $username,
				'user_email'   => $email,
				'user_pass'    => $pass,
				'first_name'   => $first,
				'last_name'    => $last,
				'display_name' => trim( $first . ' ' . $last ) ? trim( $first . ' ' . $last ) : $username,
				'role'         => 'customer',
			)
		);
		if ( is_wp_error( $user_id ) ) {
			return new WP_Error( 'fy_app_register', $user_id->get_error_message(), array( 'status' => 400 ) );
		}

		if ( $phone ) {
			update_user_meta( $user_id, 'billing_phone', $phone );
			update_user_meta( $user_id, 'billing_email', $email );
		}
		if ( $region ) {
			update_user_meta( $user_id, '_fy_region', $region );
		}
		if ( isset( $params['billing'] ) && is_array( $params['billing'] ) ) {
			self::save_billing( $user_id, $params['billing'] );
		}
		if ( isset( $params['settings'] ) && is_array( $params['settings'] ) ) {
			update_user_meta( $user_id, self::SETTINGS, self::sanitize_settings( $params['settings'] ) );
		}

		if ( function_exists( 'wc_create_new_customer' ) && ! function_exists( 'WC' ) ) {
			// Woo already created via role=customer + wp_insert_user.
		}

		$token = self::issue_token( $user_id );
		return rest_ensure_response(
			array(
				'ok'    => true,
				'token' => $token,
				'user'  => self::shape( $user_id ),
			)
		);
	}

	public static function login( $request ) {
		$params = self::params( $request );
		$email  = isset( $params['email'] ) ? sanitize_email( $params['email'] ) : '';
		$pass   = isset( $params['password'] ) ? (string) $params['password'] : '';
		if ( ! $email || ! $pass ) {
			return new WP_Error( 'fy_app_login', __( 'Email and password are required.', 'fy-app' ), array( 'status' => 400 ) );
		}

		$user = wp_authenticate( $email, $pass );
		if ( is_wp_error( $user ) ) {
			$by_login = get_user_by( 'login', $email );
			if ( $by_login ) {
				$user = wp_authenticate( $by_login->user_login, $pass );
			}
		}
		if ( is_wp_error( $user ) ) {
			return new WP_Error( 'fy_app_bad_login', __( 'Email or password is not correct.', 'fy-app' ), array( 'status' => 401 ) );
		}

		$token = self::issue_token( $user->ID );
		return rest_ensure_response(
			array(
				'ok'    => true,
				'token' => $token,
				'user'  => self::shape( $user->ID ),
			)
		);
	}

	public static function logout( $request ) {
		$user_id = self::user_id( $request );
		if ( $user_id ) {
			delete_user_meta( $user_id, self::TOKEN_META );
			delete_user_meta( $user_id, self::TOKEN_EXP );
		}
		return rest_ensure_response( array( 'ok' => true ) );
	}

	public static function me( $request ) {
		$user_id = self::user_id( $request );
		if ( ! $user_id ) {
			return new WP_Error( 'fy_app_auth', __( 'Please log in.', 'fy-app' ), array( 'status' => 401 ) );
		}
		return rest_ensure_response(
			array(
				'ok'       => true,
				'user'     => self::shape( $user_id ),
				'bookings' => self::bookings( $user_id ),
			)
		);
	}

	public static function update_me( $request ) {
		$user_id = self::user_id( $request );
		if ( ! $user_id ) {
			return new WP_Error( 'fy_app_auth', __( 'Please log in.', 'fy-app' ), array( 'status' => 401 ) );
		}
		$params = self::params( $request );
		$update = array( 'ID' => $user_id );

		if ( isset( $params['first_name'] ) ) {
			$update['first_name'] = sanitize_text_field( $params['first_name'] );
		}
		if ( isset( $params['last_name'] ) ) {
			$update['last_name'] = sanitize_text_field( $params['last_name'] );
		}
		if ( isset( $params['display_name'] ) ) {
			$update['display_name'] = sanitize_text_field( $params['display_name'] );
		}
		if ( count( $update ) > 1 ) {
			wp_update_user( $update );
		}
		if ( isset( $params['phone'] ) ) {
			update_user_meta( $user_id, 'billing_phone', sanitize_text_field( $params['phone'] ) );
		}
		if ( isset( $params['region'] ) ) {
			$region = self::region( $params['region'] );
			if ( $region ) {
				update_user_meta( $user_id, '_fy_region', $region );
			}
		}
		if ( isset( $params['notes'] ) ) {
			update_user_meta( $user_id, '_fy_app_notes', sanitize_textarea_field( $params['notes'] ) );
		}
		if ( isset( $params['typical_guests'] ) ) {
			update_user_meta( $user_id, '_fy_app_typical_guests', absint( $params['typical_guests'] ) );
		}
		if ( isset( $params['occasion'] ) ) {
			update_user_meta( $user_id, '_fy_app_occasion', sanitize_text_field( $params['occasion'] ) );
		}
		if ( isset( $params['billing'] ) && is_array( $params['billing'] ) ) {
			self::save_billing( $user_id, $params['billing'] );
		}
		if ( isset( $params['settings'] ) && is_array( $params['settings'] ) ) {
			$current = get_user_meta( $user_id, self::SETTINGS, true );
			$current = is_array( $current ) ? $current : array();
			update_user_meta( $user_id, self::SETTINGS, array_merge( $current, self::sanitize_settings( $params['settings'] ) ) );
		}
		if ( ! empty( $params['photo_data'] ) && is_string( $params['photo_data'] ) ) {
			self::save_photo_data( $user_id, $params['photo_data'] );
		}

		return rest_ensure_response(
			array(
				'ok'   => true,
				'user' => self::shape( $user_id ),
			)
		);
	}

	public static function photo( $request ) {
		$user_id = self::user_id( $request );
		if ( ! $user_id ) {
			return new WP_Error( 'fy_app_auth', __( 'Please log in.', 'fy-app' ), array( 'status' => 401 ) );
		}

		$files = $request->get_file_params();
		if ( ! empty( $files['photo']['tmp_name'] ) ) {
			require_once ABSPATH . 'wp-admin/includes/image.php';
			require_once ABSPATH . 'wp-admin/includes/file.php';
			require_once ABSPATH . 'wp-admin/includes/media.php';
			$attach_id = media_handle_sideload(
				array(
					'name'     => $files['photo']['name'],
					'type'     => $files['photo']['type'],
					'tmp_name' => $files['photo']['tmp_name'],
					'error'    => $files['photo']['error'],
					'size'     => $files['photo']['size'],
				),
				0
			);
			if ( is_wp_error( $attach_id ) ) {
				return $attach_id;
			}
			update_user_meta( $user_id, '_fy_avatar_id', (int) $attach_id );
		} else {
			$params = self::params( $request );
			if ( empty( $params['photo_data'] ) ) {
				return new WP_Error( 'fy_app_photo', __( 'Choose a photo.', 'fy-app' ), array( 'status' => 400 ) );
			}
			$saved = self::save_photo_data( $user_id, $params['photo_data'] );
			if ( is_wp_error( $saved ) ) {
				return $saved;
			}
		}

		return rest_ensure_response(
			array(
				'ok'   => true,
				'user' => self::shape( $user_id ),
			)
		);
	}

	public static function shape( $user_id ) {
		$user   = get_userdata( $user_id );
		$avatar = 0;
		$photo  = '';
		if ( class_exists( 'FY_Fleet_Account' ) ) {
			$avatar = (int) FY_Fleet_Account::avatar_id( $user_id );
		} else {
			$avatar = (int) get_user_meta( $user_id, '_fy_avatar_id', true );
		}
		if ( $avatar ) {
			$photo = wp_get_attachment_image_url( $avatar, 'medium' );
		}
		if ( ! $photo ) {
			$photo = get_avatar_url( $user_id, array( 'size' => 240 ) );
		}

		$settings = get_user_meta( $user_id, self::SETTINGS, true );
		if ( ! is_array( $settings ) ) {
			$settings = array();
		}

		return array(
			'id'             => (int) $user_id,
			'woo_id'         => (int) $user_id,
			'email'          => $user ? $user->user_email : '',
			'username'       => $user ? $user->user_login : '',
			'first_name'     => $user ? $user->first_name : '',
			'last_name'      => $user ? $user->last_name : '',
			'display_name'   => $user ? $user->display_name : '',
			'phone'          => (string) get_user_meta( $user_id, 'billing_phone', true ),
			'region'         => (string) get_user_meta( $user_id, '_fy_region', true ),
			'photo_url'      => $photo ? $photo : '',
			'notes'          => (string) get_user_meta( $user_id, '_fy_app_notes', true ),
			'occasion'       => (string) get_user_meta( $user_id, '_fy_app_occasion', true ),
			'typical_guests' => (int) get_user_meta( $user_id, '_fy_app_typical_guests', true ),
			'billing'        => array(
				'first_name' => (string) get_user_meta( $user_id, 'billing_first_name', true ),
				'last_name'  => (string) get_user_meta( $user_id, 'billing_last_name', true ),
				'company'    => (string) get_user_meta( $user_id, 'billing_company', true ),
				'address_1'  => (string) get_user_meta( $user_id, 'billing_address_1', true ),
				'address_2'  => (string) get_user_meta( $user_id, 'billing_address_2', true ),
				'city'       => (string) get_user_meta( $user_id, 'billing_city', true ),
				'state'      => (string) get_user_meta( $user_id, 'billing_state', true ),
				'postcode'   => (string) get_user_meta( $user_id, 'billing_postcode', true ),
				'country'    => (string) get_user_meta( $user_id, 'billing_country', true ),
				'phone'      => (string) get_user_meta( $user_id, 'billing_phone', true ),
			),
			'settings'       => $settings,
			'account_url'    => function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : home_url( '/my-account/' ),
		);
	}

	public static function bookings( $user_id ) {
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return array();
		}
		$orders = wc_get_orders(
			array(
				'customer' => $user_id,
				'limit'    => 25,
				'orderby'  => 'date',
				'order'    => 'DESC',
			)
		);
		$out    = array();
		foreach ( $orders as $order ) {
			$lines = array();
			foreach ( $order->get_items() as $item ) {
				$lines[] = array(
					'name'     => $item->get_name(),
					'yacht_id' => (int) $item->get_meta( '_fy_yacht_id' ),
					'date'     => $item->get_meta( '_fy_date' ),
					'time'     => $item->get_meta( '_fy_time' ),
					'duration' => $item->get_meta( '_fy_duration' ),
					'guests'   => (int) $item->get_meta( '_fy_guests' ),
					'marina'   => $item->get_meta( '_fy_marina' ),
					'total'    => (float) $item->get_meta( '_fy_charter_total' ),
					'deposit'  => (float) $item->get_meta( '_fy_deposit' ),
					'balance'  => (float) $item->get_meta( '_fy_balance' ),
				);
			}
			$out[] = array(
				'order_id'     => $order->get_id(),
				'order_no'     => $order->get_order_number(),
				'status'       => $order->get_status(),
				'total'        => (float) $order->get_total(),
				'currency'     => $order->get_currency(),
				'date_created' => $order->get_date_created() ? $order->get_date_created()->date( 'c' ) : '',
				'lines'        => $lines,
			);
		}
		return $out;
	}

	private static function issue_token( $user_id ) {
		$token = bin2hex( random_bytes( 32 ) );
		update_user_meta( $user_id, self::TOKEN_META, hash( 'sha256', $token ) );
		update_user_meta( $user_id, self::TOKEN_EXP, time() + ( YEAR_IN_SECONDS ) );
		return $token;
	}

	private static function params( $request ) {
		$json = $request->get_json_params();
		if ( is_array( $json ) && $json ) {
			return $json;
		}
		return $request->get_params();
	}

	private static function region( $value ) {
		$value = sanitize_key( $value );
		return in_array( $value, array( 'miami', 'panama' ), true ) ? $value : '';
	}

	private static function username_from_email( $email ) {
		$base = sanitize_user( current( explode( '@', $email ) ), true );
		if ( ! $base ) {
			$base = 'guest';
		}
		$try = $base;
		$i   = 1;
		while ( username_exists( $try ) ) {
			$try = $base . $i;
			$i++;
		}
		return $try;
	}

	private static function save_billing( $user_id, $billing ) {
		$map = array(
			'first_name',
			'last_name',
			'company',
			'address_1',
			'address_2',
			'city',
			'state',
			'postcode',
			'country',
			'phone',
		);
		foreach ( $map as $key ) {
			if ( isset( $billing[ $key ] ) ) {
				update_user_meta( $user_id, 'billing_' . $key, sanitize_text_field( $billing[ $key ] ) );
			}
		}
	}

	private static function sanitize_settings( $settings ) {
		$out = array();
		if ( isset( $settings['defaultCity'] ) && in_array( $settings['defaultCity'], array( 'miami', 'panama' ), true ) ) {
			$out['defaultCity'] = $settings['defaultCity'];
		}
		if ( isset( $settings['prefillTalk'] ) ) {
			$out['prefillTalk'] = (bool) $settings['prefillTalk'];
		}
		if ( isset( $settings['preferredContact'] ) && in_array( $settings['preferredContact'], array( 'call', 'whatsapp', 'sms' ), true ) ) {
			$out['preferredContact'] = $settings['preferredContact'];
		}
		if ( isset( $settings['compactCards'] ) ) {
			$out['compactCards'] = (bool) $settings['compactCards'];
		}
		if ( isset( $settings['showPrices'] ) ) {
			$out['showPrices'] = (bool) $settings['showPrices'];
		}
		if ( isset( $settings['language'] ) && in_array( $settings['language'], array( 'en', 'es' ), true ) ) {
			$out['language'] = $settings['language'];
		}
		if ( isset( $settings['themeId'] ) ) {
			$out['themeId'] = sanitize_key( $settings['themeId'] );
		}
		if ( isset( $settings['customAccent'] ) && preg_match( '/^#[0-9a-fA-F]{6}$/', $settings['customAccent'] ) ) {
			$out['customAccent'] = $settings['customAccent'];
		}
		if ( isset( $settings['customHeader'] ) && preg_match( '/^#[0-9a-fA-F]{6}$/', $settings['customHeader'] ) ) {
			$out['customHeader'] = $settings['customHeader'];
		}
		return $out;
	}

	private static function save_photo_data( $user_id, $data ) {
		if ( ! preg_match( '/^data:image\/(jpeg|jpg|png|webp);base64,/', $data, $m ) ) {
			return new WP_Error( 'fy_app_photo', __( 'Photo must be a JPEG, PNG, or WebP.', 'fy-app' ), array( 'status' => 400 ) );
		}
		$raw = base64_decode( preg_replace( '/^data:image\/[a-zA-Z]+;base64,/', '', $data ), true );
		if ( ! $raw || strlen( $raw ) > 2 * 1024 * 1024 ) {
			return new WP_Error( 'fy_app_photo', __( 'Photo is too large. Use a smaller image.', 'fy-app' ), array( 'status' => 400 ) );
		}
		$ext  = 'jpg' === $m[1] ? 'jpeg' : $m[1];
		$tmp  = wp_tempnam( 'fy-avatar' );
		file_put_contents( $tmp, $raw );
		require_once ABSPATH . 'wp-admin/includes/image.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		$file = array(
			'name'     => 'fy-avatar-' . $user_id . '.' . $ext,
			'type'     => 'image/' . $ext,
			'tmp_name' => $tmp,
			'error'    => 0,
			'size'     => strlen( $raw ),
		);
		$id   = media_handle_sideload( $file, 0 );
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		update_user_meta( $user_id, '_fy_avatar_id', (int) $id );
		return $id;
	}
}
