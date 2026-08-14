<?php
/**
 * Reads live fleet data from Feeling Yachty Suite 3.65.0 (namespace fy/v1).
 *
 * @package FeelingYachtyChatbot
 */

defined( 'ABSPATH' ) || exit;

class FY_Chatbot_Fleet_Client {

	public const NS = 'fy/v1';

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public function yachts( string $fleet = '' ): array {
		$path = $fleet !== ''
			? 'fleets/' . sanitize_title( $fleet ) . '/yachts'
			: 'yachts';

		$data = $this->get( $path );
		return is_array( $data ) ? $data : array();
	}

	/**
	 * @return array<int, array<string, mixed>>
	 */
	public function fleets(): array {
		$data = $this->get( 'fleets' );
		return is_array( $data ) ? $data : array();
	}

	public function suite_available(): bool {
		$response = $this->request( '' );
		if ( is_wp_error( $response ) ) {
			return false;
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		return $code >= 200 && $code < 300;
	}

	/**
	 * @return array<string, mixed>|array<int, mixed>|null
	 */
	private function get( string $path ) {
		$cache_key = 'fy_chatbot_fyv1_' . md5( $path );
		$cached    = get_transient( $cache_key );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		$response = $this->request( $path );
		if ( is_wp_error( $response ) ) {
			return null;
		}

		$code = (int) wp_remote_retrieve_response_code( $response );
		if ( $code < 200 || $code >= 300 ) {
			return null;
		}

		$body = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $body ) ) {
			return null;
		}

		set_transient( $cache_key, $body, 5 * MINUTE_IN_SECONDS );
		return $body;
	}

	/**
	 * @return array<string, mixed>|\WP_Error
	 */
	private function request( string $path ) {
		$url = rest_url( self::NS . ( $path !== '' ? '/' . ltrim( $path, '/' ) : '' ) );
		return wp_remote_get(
			$url,
			array(
				'timeout' => 12,
				'headers' => array(
					'Accept' => 'application/json',
				),
			)
		);
	}
}
