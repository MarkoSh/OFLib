(async () => {
	class OFLibContent {
		constructor() {
			const $this = this;

			const options = {
				subtree: true,
				childList: true,
				attributes: true,
			};

			const observer = new MutationObserver((mutations, self) => {
				const head = document.head;

				if (head) {
					const href = chrome.runtime.getURL('css/style.css');

					const link = document.createElement('link');

					link.id = 'OFLibStyle';

					link.rel = 'stylesheet';
					link.type = 'text/css';
					link.href = href;

					head.appendChild(link);

					const observer = () => {
						const style = head.querySelector('[id="OFLibStyle"]');

						if (!style) {
							head.appendChild(link);
						}

						setTimeout(observer, 100);
					};

					observer();

					self.disconnect();
				}
			});

			observer.observe(document, options);

			$this.listener();
		}

		listener() {
			const $this = this;

			window.addEventListener('message', async (e: MessageEvent) => {
				const { data } = e;

				const { OFLibOutbox } = data;

				if (OFLibOutbox) {
					chrome.runtime.sendMessage({ OFLibOutbox });
				}
			});

			chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: Function) => {
				sendResponse({ status: true });

				window.postMessage({ OFLibInbox: message });
			});
		}
	}

	window.OFLibContent = new OFLibContent();
})();