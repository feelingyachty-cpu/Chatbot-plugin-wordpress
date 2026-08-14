<?php
/**
 * Minimal stubs so matcher/parser tests run without WordPress.
 */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

if ( ! function_exists( 'get_option' ) ) {
	function get_option( $key, $default = false ) {
		return $default;
	}
}

require_once dirname( __DIR__ ) . '/includes/class-intent-parser.php';
require_once dirname( __DIR__ ) . '/includes/class-fleet-client.php';
require_once dirname( __DIR__ ) . '/includes/class-chat-engine.php';
