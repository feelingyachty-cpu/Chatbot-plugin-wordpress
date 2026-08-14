<?php
/**
 * Bootstrap.
 *
 * @package FeelingYachtyChatbot
 */

defined( 'ABSPATH' ) || exit;

class FY_Chatbot_Plugin {

	private static ?self $instance = null;

	private FY_Chatbot_Fleet_Client $fleet;
	private FY_Chatbot_Engine $engine;
	private FY_Chatbot_REST $rest;
	private FY_Chatbot_Admin $admin;

	public static function instance(): self {
		if ( self::$instance === null ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		$this->fleet  = new FY_Chatbot_Fleet_Client();
		$this->engine = new FY_Chatbot_Engine( $this->fleet, new FY_Chatbot_Intent_Parser() );
		$this->rest   = new FY_Chatbot_REST( $this->engine, $this->fleet );
		$this->admin  = new FY_Chatbot_Admin();
	}

	public function boot(): void {
		add_action( 'rest_api_init', array( $this->rest, 'register' ) );
		$this->admin->register();
		add_action( 'wp_enqueue_scripts', array( $this, 'assets' ) );
		add_action( 'wp_footer', array( $this, 'widget' ) );
		add_shortcode( 'fy_fleet_chat', array( $this, 'shortcode' ) );
	}

	public function assets(): void {
		if ( is_admin() || ! get_option( 'fy_chatbot_enabled', true ) ) {
			return;
		}
		wp_enqueue_style(
			'fy-fleet-chatbot',
			FY_CHATBOT_URL . 'assets/css/widget.css',
			array(),
			FY_CHATBOT_VERSION
		);
		wp_enqueue_script(
			'fy-fleet-chatbot',
			FY_CHATBOT_URL . 'assets/js/widget.js',
			array(),
			FY_CHATBOT_VERSION,
			true
		);
		wp_localize_script(
			'fy-fleet-chatbot',
			'fyFleetChat',
			array(
				'endpoint' => esc_url_raw( rest_url( FY_Chatbot_REST::NS . '/chat' ) ),
				'nonce'    => wp_create_nonce( 'wp_rest' ),
				'greeting' => (string) get_option( 'fy_chatbot_greeting', 'Hi! So glad you reached out to Feeling Yachty. I’d love to help make this easy.' ),
				'phone'    => (string) get_option( 'fy_chatbot_phone', '+1-754-325-3827' ),
			)
		);
	}

	public function widget(): void {
		if ( is_admin() || ! get_option( 'fy_chatbot_enabled', true ) ) {
			return;
		}
		echo $this->markup(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	public function shortcode(): string {
		return $this->markup();
	}

	private function markup(): string {
		return '<div id="fy-fleet-chat" class="fy-fleet-chat" data-suite="feeling-yachty-suite-3.65.0">'
			. '<button type="button" class="fy-fleet-chat__toggle" aria-expanded="false" aria-controls="fy-fleet-chat-panel">Chat</button>'
			. '<div id="fy-fleet-chat-panel" class="fy-fleet-chat__panel" hidden>'
			. '<div class="fy-fleet-chat__head">Feeling Yachty</div>'
			. '<div class="fy-fleet-chat__log" role="log" aria-live="polite"></div>'
			. '<form class="fy-fleet-chat__form"><label class="screen-reader-text" for="fy-fleet-chat-input">Message</label>'
			. '<input id="fy-fleet-chat-input" type="text" autocomplete="off" placeholder="Miami or Panama? Date, guests, hours…" />'
			. '<button type="submit">Send</button></form></div></div>';
	}
}
