<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * App-facing REST. Catalog and quote stay on WordPress so iOS and Android
 * share one contract. Payment stays on the linked Woo product.
 */
class FY_App_REST {

	const NS = 'fy-app/v1';

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
		add_filter( 'rest_pre_serve_request', array( __CLASS__, 'cors' ), 10, 4 );
	}

	public static function cors( $served, $result, $request, $server ) {
		$route = $request->get_route();
		if ( 0 !== strpos( (string) $route, '/' . self::NS ) ) {
			return $served;
		}
		header( 'Access-Control-Allow-Origin: *' );
		header( 'Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS' );
		header( 'Access-Control-Allow-Headers: Authorization, Content-Type, x-fy-app-key' );
		return $served;
	}

	public static function register_routes() {
		register_rest_route(
			self::NS,
			'/config',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'config' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::NS,
			'/catalog',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'catalog' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::NS,
			'/yachts/(?P<id>\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'yacht' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::NS,
			'/quote',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'quote' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			self::NS,
			'/auth/register',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( 'FY_App_Auth', 'register' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			self::NS,
			'/auth/login',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( 'FY_App_Auth', 'login' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			self::NS,
			'/auth/logout',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( 'FY_App_Auth', 'logout' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			self::NS,
			'/me',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( 'FY_App_Auth', 'me' ),
					'permission_callback' => '__return_true',
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( 'FY_App_Auth', 'update_me' ),
					'permission_callback' => '__return_true',
				),
			)
		);
		register_rest_route(
			self::NS,
			'/me/photo',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( 'FY_App_Auth', 'photo' ),
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			self::NS,
			'/me/bookings',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'my_bookings' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public static function config() {
		$booking = class_exists( 'FY_Fleet_Settings' ) ? FY_Fleet_Settings::get_booking() : array();
		$display = class_exists( 'FY_Fleet_Settings' ) ? FY_Fleet_Settings::get() : array();

		return rest_ensure_response(
			array(
				'name'    => 'Feeling Yachty',
				'chatbot' => false,
				'comms'   => 'ghl',
				'cities'  => array(
					array(
						'slug'       => 'miami',
						'label'      => 'Miami',
						'fleet'      => 'miami-yacht-rental',
						'phone'      => isset( $booking['phone_miami'] ) ? $booking['phone_miami'] : '+1 954-246-3636',
						'whatsapp'   => isset( $display['whatsapp_number'] ) ? $display['whatsapp_number'] : '17543253827',
					),
					array(
						'slug'     => 'panama',
						'label'    => 'Panama',
						'fleet'    => 'panama-yacht-rentals',
						'phone'    => isset( $booking['phone_panama'] ) ? $booking['phone_panama'] : '+507 202-1729',
						'whatsapp' => '5072021729',
					),
				),
				'suite' => class_exists( 'FY_Fleet_REST' ),
				'woo'   => class_exists( 'WooCommerce' ),
			)
		);
	}

	public static function catalog( $request ) {
		$fleet = sanitize_key( $request->get_param( 'fleet' ) );
		if ( ! $fleet ) {
			$fleet = 'miami-yacht-rental';
		}
		$page     = max( 1, intval( $request->get_param( 'page' ) ) );
		$per_page = min( 50, max( 1, intval( $request->get_param( 'per_page' ) ?: 24 ) ) );
		$pink     = $request->get_param( 'pink' );

		$args = array(
			'post_type'      => 'fy_yacht',
			'post_status'    => 'publish',
			'posts_per_page' => $per_page,
			'paged'          => $page,
			'orderby'        => 'title',
			'order'          => 'ASC',
			'tax_query'      => array(
				array(
					'taxonomy' => 'fy_yacht_cat',
					'field'    => 'slug',
					'terms'    => $fleet,
				),
			),
		);

		if ( '1' === (string) $pink || 'true' === $pink ) {
			$args['meta_query'] = array(
				array(
					'key'   => '_fy_is_pink',
					'value' => '1',
				),
			);
		}

		$query = new WP_Query( $args );
		$items = array();
		foreach ( $query->posts as $post ) {
			$items[] = self::card( $post->ID );
		}

		return rest_ensure_response(
			array(
				'fleet'       => $fleet,
				'page'        => $page,
				'per_page'    => $per_page,
				'total'       => (int) $query->found_posts,
				'total_pages' => (int) $query->max_num_pages,
				'yachts'      => $items,
			)
		);
	}

	public static function yacht( $request ) {
		$id = intval( $request['id'] );
		if ( 'fy_yacht' !== get_post_type( $id ) || 'publish' !== get_post_status( $id ) ) {
			return new WP_Error( 'fy_app_not_found', __( 'Yacht not found.', 'fy-app' ), array( 'status' => 404 ) );
		}

		$shape = class_exists( 'FY_Fleet_REST' ) ? FY_Fleet_REST::shape( $id ) : array( 'id' => $id );
		$form  = class_exists( 'FY_Fleet_Pricing' ) ? FY_Fleet_Pricing::form_data( $id ) : null;

		return rest_ensure_response(
			array(
				'yacht'     => $shape,
				'form'      => $form,
				'card'      => self::card( $id ),
				'checkout'  => array(
					'product_id'  => isset( $shape['product_id'] ) ? (int) $shape['product_id'] : 0,
					'product_url' => isset( $shape['product_url'] ) ? $shape['product_url'] : '',
				),
			)
		);
	}

	public static function quote( $request ) {
		if ( ! class_exists( 'FY_Fleet_Pricing' ) ) {
			return new WP_Error( 'fy_app_no_suite', __( 'Suite pricing is not available.', 'fy-app' ), array( 'status' => 503 ) );
		}

		$params   = $request->get_json_params();
		$params   = is_array( $params ) ? $params : $request->get_params();
		$yacht_id = isset( $params['yacht_id'] ) ? intval( $params['yacht_id'] ) : 0;
		$quote    = FY_Fleet_Pricing::quote( $yacht_id, $params );
		if ( is_wp_error( $quote ) ) {
			return $quote;
		}

		$product_id  = (int) get_post_meta( $yacht_id, '_fy_product_id', true );
		$product_url = ( $product_id && 'product' === get_post_type( $product_id ) ) ? get_permalink( $product_id ) : '';

		return rest_ensure_response(
			array(
				'quote'       => $quote,
				'product_id'  => $product_id,
				'product_url' => $product_url,
				'pay_on'      => 'woocommerce',
			)
		);
	}

	public static function my_bookings( $request ) {
		$user_id = class_exists( 'FY_App_Auth' ) ? FY_App_Auth::user_id( $request ) : 0;
		if ( ! $user_id ) {
			return new WP_Error( 'fy_app_auth', __( 'Please log in.', 'fy-app' ), array( 'status' => 401 ) );
		}
		return rest_ensure_response( array( 'bookings' => FY_App_Auth::bookings( $user_id ) ) );
	}

	private static function card( $yacht_id ) {
		$product_id = (int) get_post_meta( $yacht_id, '_fy_product_id', true );
		$rows       = get_post_meta( $yacht_id, '_fy_pricing', true );
		$starting   = self::starting_total( is_array( $rows ) ? $rows : array() );
		$image      = get_the_post_thumbnail_url( $yacht_id, 'large' );
		if ( ! $image ) {
			$image = (string) get_post_meta( $yacht_id, '_fy_image_url', true );
		}

		return array(
			'id'           => $yacht_id,
			'title'        => get_the_title( $yacht_id ),
			'size_ft'      => (int) get_post_meta( $yacht_id, '_fy_size_ft', true ),
			'capacity_max' => class_exists( 'FY_Fleet_CPT' ) ? FY_Fleet_CPT::capacity( $yacht_id ) : (int) get_post_meta( $yacht_id, '_fy_capacity_max', true ),
			'is_pink'      => (bool) get_post_meta( $yacht_id, '_fy_is_pink', true ),
			'is_free_hour' => (bool) get_post_meta( $yacht_id, '_fy_is_free_hour', true ),
			'image_url'    => $image ? $image : '',
			'product_id'   => $product_id,
			'product_url'  => ( $product_id && 'product' === get_post_type( $product_id ) ) ? get_permalink( $product_id ) : '',
			'starting'     => $starting,
		);
	}

	/**
	 * First price-row total. Never hourly `price` × hours.
	 */
	private static function starting_total( $rows ) {
		foreach ( $rows as $row ) {
			if ( isset( $row['type'] ) && 'price' === $row['type'] && isset( $row['price'] ) ) {
				return array(
					'amount'   => (float) $row['price'],
					'duration' => isset( $row['duration'] ) ? $row['duration'] : '',
				);
			}
		}
		return null;
	}
}
