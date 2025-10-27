export class Handler {
	pb: any;
	userId: any;

	pings: any = {};

	constructor(OFLib: any,) {
		const $this = this;

		$this.pb = OFLib.pb;

		$this.init();
	}

	init() {
		const $this = this;

		$this.watcher();

		$this.listener();

		globalThis.calc = $this;
	}

	listener() {
		const $this = this;

		chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: Function) => {
			sendResponse({ status: true });

			const { OFLibOutbox } = message;

			const { ping } = OFLibOutbox;

			if (ping) {
				$this.handlePing(ping, sender);

				return;
			}

			$this.handleMessage(OFLibOutbox);
		});
	}

	handlePing(ping: Date, sender: any) {
		const $this = this;

		const { tab, url } = sender;

		const { id: tabId } = tab;

		const tabUrl = new URL(url);

		if (tabUrl.hashParams.has('calc')) {
			$this.pings[tabId] = new Date(ping);
		}
	}

	async watcher() {
		const $this = this;

		let to = 30;

		const tabs = await chrome.tabs.query({
			url: 'https://onlyfans.com/help',
		});

		const found = tabs.find((tab: any) => {
			const { url } = tab;

			const tabUrl = new URL(url);

			if (tabUrl.hashParams.has('calc')) {
				return true;
			}

			return false;
		});

		if (found) {
			const {id: tabId} = found;

			const lastTs = $this.pings[tabId];

			if (lastTs) {
				const currentTs = new Date();

				const diff = (currentTs.getTime() - lastTs.getTime()) / 1000;

				if (10 < diff) {
					console.log('Reload it');

					delete $this.pings[tabId];

					chrome.tabs.reload(tabId);

					to = 60;
				}
			} else {}
		}

		setTimeout(() => {
			$this.watcher();
		}, to * 1000);
	}

	async handleMessage(message: any, sender: any = false) {
		const $this = this;

		const {
			model,
			promotions,
			trials,
			campaigns,
		} = message;

		if (model) {
			const batch = $this.pb.createBatch();

			const { userId } = model;

			$this.userId = userId;

			{
				const payload = {
					...model,
					data: model,
				};

				try {
					const result = await $this.pb.collection('parser_models').getFirstListItem(`userId=${userId}`);

					payload.id = result.id;

					payload.newFans = payload.newFans < result.newFans ? result.newFans : payload.newFans;
					payload.newSpenders = payload.newSpenders < result.newSpenders ? result.newSpenders : payload.newSpenders;

					batch.collection('parser_models').upsert(payload);
				} catch (error: any) {
					batch.collection('parser_models').create(payload);
				}
			}

			const proms = [
				...Object.values(promotions || {}).map((item: any) => {
					return new Promise(async (resolve, reject) => {
						const { promotionId } = item;

						console.log(`Promotion ${promotionId} storing...`);

						const payload = {
							...item,
							// lastParseDate: item.lastParseDate ? new Date().toJSON() : null,
							status: item.lastParseDate ? 'Parsed' : 'Parsing...',
							data: item,
						};

						try {
							const result = await $this.pb.collection('parser_promotions').getFirstListItem(`userId=${userId} && promotionId=${promotionId}`);

							payload.id = result.id;

							payload.newFans = payload.newFans < result.newFans ? result.newFans : payload.newFans;
							payload.inboxes = payload.inboxes < result.inboxes ? result.inboxes : payload.inboxes;
							payload.reads = payload.reads < result.reads ? result.reads : payload.reads;
							payload.replies = payload.replies < result.replies ? result.replies : payload.replies;
							payload.newSpenders = payload.newSpenders < result.newSpenders ? result.newSpenders : payload.newSpenders;
							payload.totalSumm = payload.totalSumm < result.totalSumm ? result.totalSumm : payload.totalSumm;

							batch.collection('parser_promotions').upsert(payload);
						} catch (error: any) {
							batch.collection('parser_promotions').create(payload);
						}

						console.log(`Promotion ${promotionId} storing...done`);

						resolve(true);

					});
				}),
				...Object.values(campaigns || {}).map((item: any) => {
					return new Promise(async (resolve, reject) => {
						const { campaignId } = item;

						console.log(`Campaign ${campaignId} storing...`);

						const payload = {
							...item,
							// lastParseDate: item.lastParseDate ? new Date().toJSON() : null,
							status: item.lastParseDate ? 'Parsed' : 'Parsing...',
							data: item,
						};

						try {
							const result = await $this.pb.collection('parser_campaigns').getFirstListItem(`userId=${userId} && campaignId=${campaignId}`);

							payload.id = result.id;

							payload.newFans = payload.newFans < result.newFans ? result.newFans : payload.newFans;
							payload.inbox = payload.inbox < result.inbox ? result.inbox : payload.inbox;
							payload.reads = payload.reads < result.reads ? result.reads : payload.reads;
							payload.replies = payload.replies < result.replies ? result.replies : payload.replies;
							payload.newSpenders = payload.newSpenders < result.newSpenders ? result.newSpenders : payload.newSpenders;
							payload.totalSumm = payload.totalSumm < result.totalSumm ? result.totalSumm : payload.totalSumm;

							batch.collection('parser_campaigns').upsert(payload);
						} catch (error: any) {
							batch.collection('parser_campaigns').create(payload);
						}

						console.log(`Campaign ${campaignId} storing...done`);

						resolve(true);

					});
				}),
				...Object.values(trials || {}).map((item: any) => {
					return new Promise(async (resolve, reject) => {
						const { trialId } = item;

						console.log(`Trial ${trialId} storing...`);

						const payload = {
							...item,
							// lastParseDate: item.lastParseDate ? new Date().toJSON() : null,
							status: item.lastParseDate ? 'Parsed' : 'Parsing...',
							data: item,
						};

						try {
							const result = await $this.pb.collection('parser_trials').getFirstListItem(`userId=${userId} && trialId=${trialId}`);

							payload.id = result.id;

							payload.newFans = payload.newFans < result.newFans ? result.newFans : payload.newFans;
							payload.inboxes = payload.inboxes < result.inboxes ? result.inboxes : payload.inboxes;
							payload.reads = payload.reads < result.reads ? result.reads : payload.reads;
							payload.replies = payload.replies < result.replies ? result.replies : payload.replies;
							payload.newSpenders = payload.newSpenders < result.newSpenders ? result.newSpenders : payload.newSpenders;
							payload.totalSumm = payload.totalSumm < result.totalSumm ? result.totalSumm : payload.totalSumm;

							batch.collection('parser_trials').upsert(payload);
						} catch (error: any) {
							batch.collection('parser_trials').create(payload);
						}

						console.log(`Trial ${trialId} storing...done`);

						resolve(true);

					});
				}),
			];

			await Promise.all(proms);

			const result = await batch.send();
		}
	}

	reset() {
		const $this = this;

		return new Promise(async (resolve, reject) => {
			const { userId } = $this;

			if (userId) {
				const batch = $this.pb.createBatch();

				{
					const result = await $this.pb.collection('parser_promotions').getFullList({
						filter: `userId=${userId}`,
					});

					result.map((item: any) => {
						const { id } = item;

						batch.collection('parser_promotions').delete(id);
					});
				}

				{
					const result = await $this.pb.collection('parser_campaigns').getFullList({
						filter: `userId=${userId}`,
					});

					result.map((item: any) => {
						const { id } = item;

						batch.collection('parser_campaigns').delete(id);
					});
				}

				{
					const result = await $this.pb.collection('parser_trials').getFullList({
						filter: `userId=${userId}`,
					});

					result.map((item: any) => {
						const { id } = item;

						batch.collection('parser_trials').delete(id);
					});
				}

				const result = await batch.send();
			}

			resolve(userId);
		});
	}
}