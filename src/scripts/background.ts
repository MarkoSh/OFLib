const handlers: any[] = [
];

const scripts: any[] = [
];

const external: any[] = [
];

import PocketBase from '../vendor/pocketbase.es.mjs';

URL = new Proxy(URL, {
	construct(target, args: [string]) {
		const url: URL = new target(...args);

		const hashString = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
		url.hashParams = new URLSearchParams(hashString);

		url.pathSegments = url.pathname.split('/').filter((segment: string) => segment.length > 0);

		return url;
	}
});

(async () => {
	class OFLibBackground {
		pb = new PocketBase('http://127.0.0.1:8090');
		handlers: any[] = [];

		constructor() {
			const $this = this;

			$this.pb.collection("_superusers").authWithPassword('markhost@yandex.ru', '123123123123');

			(async () => {
				{
					const scripts = await chrome.userScripts.getScripts();

					const filtered = scripts.filter((script: any) => {
						const { id: scriptId } = script;

						if (
							'OFLibInjectLocal' == scriptId ||
							'OFLibInjectExternal' == scriptId
						) return true;

						return false;
					}).map((script: any) => {
						const { id: scriptId } = script;

						return scriptId;
					});

					await chrome.userScripts.unregister({
						ids: filtered,
					});
				}

				{
					const userScripts = [{
						id: 'OFLibInjectLocal',
						js: [
							{ file: 'scripts/lib.js' },
							...scripts.map((script: string) => {
								return { file: `scripts/${script}` }
							}),
						],
						runAt: 'document_start',
						world: 'MAIN',
						matches: ['*://onlyfans.com/*'],
						allFrames: true,
					}];

					chrome.userScripts.register(userScripts);
				}

				{
					(async () => {
						if (external.length) {
							const proms = external.map(async (url: string) => {
								const response = await fetch(url);

								return response.text();
							});

							const result = await Promise.all(proms);

							chrome.userScripts.register([{
								id: 'OFLibInjectExternal',
								js: [...result.map((code: string) => {
									return { code };
								})],
								runAt: 'document_start',
								world: 'MAIN',
								matches: ['*://onlyfans.com/*'],
								allFrames: true,
							}]);
						}
					})();
				}
			})();

			handlers.map((Handler: any) => {
				return new Handler($this);
			});

			$this.listener();

			$this.init();
		}

		async init() {
			const $this = this;

			globalThis.OFLib = $this;
		}

		listener() {
			const $this = this;

			chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: Function) => {
				sendResponse({ status: true });

				const { OFLibOutbox } = message;
			});
		}
	}

	new OFLibBackground();
})();