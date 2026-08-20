/**
 * Suite's product card shows the full boat total as "due at the dock"
 * and does not subtract what WooCommerce charges today (crew + fuel,
 * plus any reservation deposit). Dock must be:
 *   boat − (charged today − extras paid now) + extras still unpaid
 *
 * Coco 4 hours: boat $1,140, charged today $700 → dock $440.
 */
(function () {
	function dollars(text) {
		if (!text) {
			return 0;
		}
		var match = String(text).replace(/,/g, '').match(/\$([0-9]+(?:\.[0-9]+)?)/);
		return match ? Number(match[1]) : 0;
	}

	function money(amount) {
		return '$' + Math.round(Number(amount)).toLocaleString('en-US');
	}

	function extrasFrom(box) {
		var found = { total: 0, now: 0, later: 0 };
		var lines = box.querySelectorAll('.fy-pay-summary__line');
		for (var i = 0; i < lines.length; i++) {
			var text = lines[i].textContent || '';
			var match = text.match(/extras\s+\$([0-9,]+)\s*[→>]\s*\$([0-9,]+)\s+now\s*\+\s*\$([0-9,]+)/i);
			if (match) {
				found.total = Number(match[1].replace(/,/g, ''));
				found.now = Number(match[2].replace(/,/g, ''));
				found.later = Number(match[3].replace(/,/g, ''));
				break;
			}
		}
		return found;
	}

	function bookingLine(box) {
		var lines = box.querySelectorAll('.fy-pay-summary__line');
		for (var i = 0; i < lines.length; i++) {
			var label = (lines[i].querySelector('span') || {}).textContent || '';
			if (/^\s*Booking/i.test(label)) {
				return lines[i];
			}
		}
		return null;
	}

	function dockAmount(booking, charged, extras) {
		var towardBoat = Math.max(0, charged - extras.now);
		return Math.max(0, Math.round((booking - towardBoat + extras.later) * 100) / 100);
	}

	function paint(box) {
		var bookingEl = bookingLine(box);
		if (!bookingEl) {
			return;
		}
		var amounts = bookingEl.querySelectorAll('span');
		var booking = dollars(amounts.length ? amounts[amounts.length - 1].textContent : '');
		var chargedEl =
			box.querySelector('.fy-pay-summary__due strong') ||
			box.querySelector('.fy-pay-summary__line--total span:last-child');
		var charged = dollars(chargedEl && chargedEl.textContent);
		if (booking <= 0 || charged <= 0) {
			return;
		}
		var extras = extrasFrom(box);
		var dock = dockAmount(booking, charged, extras);
		var sig = [booking, charged, extras.now, extras.later, dock].join('|');
		if (box.getAttribute('data-fy-dock-sig') === sig) {
			return;
		}
		box.setAttribute('data-fy-dock-sig', sig);

		var label = bookingEl.querySelector('span');
		if (label) {
			label.innerHTML = label.innerHTML.replace(/\s*(?:&mdash;|—|–|-)\s*due at the dock/gi, '');
		}

		var note = box.querySelector('.fy-pay-summary__note');
		if (note) {
			note.innerHTML = note.innerHTML.replace(/Plus \$[0-9,]+/, 'Plus ' + money(dock));
		}

		var dockLine = box.querySelector('[data-fy-dock-line]');
		if (!dockLine) {
			dockLine = document.createElement('div');
			dockLine.className = 'fy-pay-summary__line';
			dockLine.setAttribute('data-fy-dock-line', '1');
			var totalLine = box.querySelector('.fy-pay-summary__line--total');
			if (totalLine && totalLine.parentNode) {
				totalLine.parentNode.insertBefore(dockLine, totalLine.nextSibling);
			}
		}
		dockLine.innerHTML =
			'<span>Due at the dock (after today’s payment)</span><span>' + money(dock) + '</span>';
	}

	function scan() {
		var boxes = document.querySelectorAll('.fy-pay-summary');
		for (var i = 0; i < boxes.length; i++) {
			paint(boxes[i]);
		}
	}

	function boot() {
		scan();
		if (!('MutationObserver' in window)) {
			return;
		}
		var root = document.querySelector('form.cart') || document.body;
		new MutationObserver(scan).observe(root, { childList: true, subtree: true });
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
	if (window.jQuery) {
		window.jQuery(document.body).on('found_variation show_variation fy_addons_changed', function () {
			setTimeout(scan, 50);
		});
	}
})();
