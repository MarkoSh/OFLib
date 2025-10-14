(async () => {
	class OFLibContent {
		constructor() {
			const $this = this;

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