const UPSTREAM = 'https://127.0.0.1:8080';

export class Worker {
	userId: number = 0;
	constructor() {
		const $this = this;

		$this.listener();
	}

	listener() {
		const $this = this;

		chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: Function) => {
			sendResponse({ status: true });

			const { tab } = sender;

			const { url: tabUrl } = tab;

			const url = new URL(tabUrl);

			const { OFLibOutbox } = message;

			const { worker } = OFLibOutbox;

			if (worker) {
				const userId = parseInt(url.hashParams.get('userId'));

				$this.userId = userId;

				const { isAuth, fingerprint } = worker;

				if (isAuth) {
					$this.updateFingerprint(fingerprint)
				} else {
					$this.fetchFingerprint();
				}
			}
		});
	}

	updateFingerprint(fingerprint: any) {
		const $this = this;

		return new Promise(async (resolve, reject) => {
			const tabs = await chrome.tabs.query({
				active: true,
			});

			if (tabs.length) {
				const tab = tabs[0];

				const { url: tabUrl } = tab;

				const url = new URL(tabUrl);

				const cookies = await chrome.cookies.getAll({
					url: tabUrl,
				});

				fingerprint.cookies = cookies;

				try {
					const response = await fetch(`${UPSTREAM}/updateFingerprint/${$this.userId}`, {
						method: 'UPDATE',
						body: JSON.stringify(fingerprint),
					});
				} catch (error: any) {
					console.error(error);
				}
			}

			resolve(true);
		});
	}

	fetchFingerprint() {
		const $this = this;

		return new Promise((resolve, reject) => {
			resolve(true);
		});
	}

	setFingerprint(fingerprint: any) {
		const $this = this;
	}
}