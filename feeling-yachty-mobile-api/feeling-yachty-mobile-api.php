<?php
/**
 * Plugin Name: Feeling Yachty Mobile API
 * Description: Thin fy-app/v1 API for the iPhone/Android app. Reads Suite yachts and their already-linked WooCommerce products. Does not create a chatbot.
 * Version: 1.1.6
 * Author: Feeling Yachty
 * Requires Plugins: woocommerce
 * Text Domain: fy-app
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'FY_APP_VERSION', '1.1.6' );
define( 'FY_APP_FILE', __FILE__ );

require_once plugin_dir_path( __FILE__ ) . 'includes/class-fy-app-auth.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/class-fy-app-quote.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/class-fy-app-rest.php';

add_action( 'plugins_loaded', array( 'FY_App_REST', 'init' ), 20 );
add_action( 'plugins_loaded', array( 'FY_App_Quote', 'init' ), 21 );
