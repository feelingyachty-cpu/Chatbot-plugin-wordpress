<?php
/**
 * REST: chat + fleet health.
 *
 * @package FeelingYachtyChatbot
 */

defined( 'ABSPATH' ) || exit;

class FY_Chatbot_REST {

	public const NS = 'fy-chatbot/v1';

	public function __construct(
		private FY_Chatbot_Engine $engine,
		private FY_Chatbot_Fleet_Client $fleet
	) {}

	public function register(): void {
		register_rest_route(
			self::NS,
			'/chat',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'chat' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'message' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_textarea_field',
					),
					'session' => array(
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'intent'  => array(
						'required' => false,
						'type'     => 'object',
					),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/health',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'health' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}

	/**
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response
	 */
	public function chat( $request ) {
		$message = (string) $request->get_param( 'message' );
		$prior   = $request->get_param( 'intent' );
		if ( ! is_array( $prior ) ) {
			$prior = array();
		}

		$webhook = (string) get_option( 'fy_chatbot_n8n_webhook', '' );
		if ( $webhook !== '' ) {
			$remote = $this->proxy_n8n( $webhook, $message, $prior, (string) $request->get_param( 'session' ) );
			if ( is_array( $remote ) && ! empty( $remote['reply'] ) ) {
				$local            = $this->engine->reply( $message, $prior );
				$remote['yachts'] = $local['yachts'] ?? array();
				$remote['source'] = 'n8n+feeling-yachty-suite-3.65.0';
				$remote['intent'] = $local['intent'] ?? $prior;
				return rest_ensure_response( $remote );
			}
		}

		return rest_ensure_response( $this->engine->reply( $message, $prior ) );
	}

	/**
	 * @return \WP_REST_Response
	 */
	public function health() {
		$yachts = $this->fleet->yachts();
		return rest_ensure_response(
			array(
				'ok'            => $this->fleet->suite_available(),
				'suite'         => 'feeling-yachty-suite',
				'suite_min'     => FY_CHATBOT_SUITE_MIN,
				'yacht_count'   => count( $yachts ),
				'fleets'        => $this->fleet->fleets(),
				'namespace'     => FY_Chatbot_Fleet_Client::NS,
			)
		);
	}

	/**
	 * @param array<string, mixed> $prior
	 * @return array<string, mixed>|null
	 */
	private function proxy_n8n( string $url, string $message, array $prior, string $session ): ?array {
		$response = wp_remote_post(
			$url,
			array(
				'timeout' => 20,
				'headers' => array( 'Content-Type' => 'application/json' ),
				'body'    => wp_json_encode(
					array(
						'message'   => $message,
						'city'      => $prior['city'] ?? '',
						'sessionId' => $session,
					)
				),
			)
		);
		if ( is_wp_error( $response ) ) {
			return null;
		}
		$body = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		return is_array( $body ) ? $body : null;
	}
}
