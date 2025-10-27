(async () => {
	const url = new URL(location.href);

	if (!url.hashParams.has('worker')) return;
	if (!url.hashParams.has('userId')) return;

	const options = {
		subtree: true,
		childList: true,
		attributes: true,
	};

	const observer = new MutationObserver((mutations, self) => {
		const app = <HTMLDivElement | any>document.querySelector('[id="app"]');

		if (app) {
			const { __vue__: vue } = app;

			if (vue) {
				const state = window.OFLib.getState();

				const { init } = state;

				const { isAuth } = init;

				const ls = {};

				Object.keys(localStorage).map((key: string) => {
					ls[key] = localStorage.getItem(key);
				});

				const ss = {};

				Object.keys(sessionStorage).map((key: string) => {
					ss[key] = sessionStorage.getItem(key);
				});

				const userAgent = navigator.userAgent;
				const appVersion = navigator.appVersion;
				const appCodeName = navigator.appCodeName;
				const appName = navigator.appName;
				const language = navigator.language;
				const platform = navigator.platform;
				const product = navigator.product;
				const productSub = navigator.productSub ? navigator.productSub : '';
				const vendor = navigator.vendor ? navigator.vendor : '';
				const vendorSub = navigator.vendorSub ? navigator.vendorSub : '';

				const fingerprint = {
					localStorage: ls,
					sessionStorage: ss,
					hostname: location.hostname,
					navigator: {
						userAgent,
						appVersion,
						appCodeName,
						appName,
						language,
						platform,
						product,
						productSub,
						vendor,
						vendorSub,
					}
				};

				window.postMessage({
					OFLibOutbox: {
						worker: {
							isAuth,
							userId: parseInt(url.hashParams.get('userId')),
							fingerprint,
						},
					}
				});

				self.disconnect();
			}
		}
	});

	observer.observe(document, options);
})();