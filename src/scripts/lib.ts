(async () => {
	window.injected = [];

	window.URL = new Proxy(URL, {
		construct(target, args: [string]) {
			const url: any = new target(...args);

			const hashString = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
			url.hashParams = new URLSearchParams(hashString);

			url.pathSegments = url.pathname.split('/').filter((segment: any) => segment.length > 0);

			return url;
		}
	});

	class RequestQueue {
		queue: Promise<void>;

		constructor() {
			this.queue = Promise.resolve();
		}

		async add(fn: any) {
			this.queue = this.queue.then(fn, fn);

			return this.queue;
		}
	}

	window.queue = new RequestQueue();

	class WorkerTimeout {
		worker: any = false;

		constructor(callback: Function, timeout: number) {
			const $this = this;
			const blob = new Blob([`setTimeout(() => postMessage(0), ${timeout});`]);

			const reader = new FileReader();

			reader.onload = () => {
				const workerScript = String(reader.result);
				$this.worker = new Worker(workerScript, {
					name: 'WorkerTimeout'
				});
				$this.worker.onmessage = () => {
					callback();

					$this.worker.terminate();
				};
			};

			reader.readAsDataURL(blob);
		}
	}

	window.setTimeoutExt = WorkerTimeout;

	class WorkerInterval {
		worker: any = false;

		constructor(callback: Function, interval: number) {
			const $this = this;
			const blob = new Blob([`setInterval(() => postMessage(0), ${interval});`]);
			const reader = new FileReader();

			reader.onload = () => {
				const workerScript = String(reader.result);
				$this.worker = new Worker(workerScript, {
					name: 'WorkerInterval'
				});
				$this.worker.onmessage = () => {
					callback();
				};
			};

			reader.readAsDataURL(blob);
		}

		stop() {
			const $this = this;

			$this.worker.terminate();
		}
	}

	window.setIntervalExt = WorkerInterval;

	class OFLib {
		app: any = {};
		actions: any = {};
		functions: any = {};

		model: any;

		constructor() {
			const $this = this;

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
						$this.app = vue;

						$this.getActions();

						const observer = () => {
							$this.getFunctions();

							if ($this.functions.doSubscribe) {
								console.log('OFLibInject loaded');

								window.postMessage({
									OFLibOutbox: 'loaded'
								});

								$this.init();

								return;
							}

							new WorkerTimeout(observer, 100);
						};

						observer();

						self.disconnect();
					}
				}
			});

			observer.observe(document, options);
		}

		getStore() {
			const $this = this;

			return $this.app.$store;
		}

		getState() {
			const $this = this;

			const store = $this.getStore();

			const { state } = store;

			return state;
		}

		getActions() {
			const $this = this;

			const { _actions: actions } = $this.getStore();

			Object.keys(actions).map((key: string) => {
				const action = actions[key];

				const split = key.split('/');

				if (!$this.actions[split[0]]) $this.actions[split[0]] = {};

				if (split[1]) {
					$this.actions[split[0]][split[1]] = action[0];
				} else {
					$this.actions[split[0]] = action[0];
				}
			});

			return $this.actions;
		}

		getFunctions() {
			const $this = this;

			const app = <HTMLDivElement | any>document.querySelector('[id="app"]');

			if (app) {
				const { __vue__: vue } = app;

				if (vue) {
					$this.app = vue;

					const collect = (vue: any) => {
						Object.keys(vue).map((key: string) => {
							if (typeof vue[key] === 'function') {
								if (!$this.functions[key]) {
									$this.functions[key] = {
										exec: vue[key],
										vue
									};
								}
							}
						});

						const { $children: children } = vue;

						children.map((child: any) => {
							collect(child);
						});
					};

					collect($this.app);
				}
			}

			return $this.functions;
		}

		getUsersByIds(params: any) {
			const $this = this;

			return new Promise((resolve, reject) => {
				const observer = async () => {
					try {
						const { getUsersByIds } = $this.actions.users;

						const response = await getUsersByIds(params);

						const state = $this.getState();

						const {
							subscribers: _subscribers,
							subscribes: _subscribes,
							users: _users
						} = state;

						const { items: subscribers } = _subscribers;
						const { items: subscribes } = _subscribes;
						const { items: users } = _users;

						const result: any = {};

						response.map((userId: any) => {
							const subscribedByData = subscribes[userId];
							const subscribedOnData = subscribers[userId];
							const user = users[userId];

							user.subscribedByData = subscribedByData;
							user.subscribedOnData = subscribedOnData;

							if (subscribedOnData) {
								result[userId] = user;
							}
						});

						resolve(result);

						return;
					} catch (error: any) {
						console.error(error);
					}

					new setTimeoutExt(observer, 100);
				};

				observer();
			});
		}

		fetchChats(params: any) {
			const $this = this;

			return new Promise(async (resolve, reject) => {
				const { fetchChats } = $this.actions.chats;

				const chats: any = {};

				const observer = async () => {
					try {
						const response = await queue.add(async () => await fetchChats(params));

						const { list, hasMore } = response;

						const usersIds = list.map((chat: any) => {
							const { withUser: user } = chat;

							const { id: userId } = user;

							chats[userId] = chat;

							return userId;
						});

						{
							const params = {
								ids: {
									f: usersIds,
								},
							};

							const response = await queue.add(async () => await $this.getUsersByIds(params));

							Object.values(response).map((user: any) => {
								const { id: userId } = user;

								Object.assign(chats[userId].withUser, user);
							});
						}

						params.more = true;

						if (!hasMore) {
							resolve(chats);

							return;
						}
					} catch (error: any) {
						console.error(error);
					}

					new setTimeoutExt(observer, 100);
				};

				observer();
			});
		}

		async init() {
			const $this = this;

			const model: any = await $this.fetchUserMe();

			if (model) {
				$this.model = model;
			}

			window.showToast = $this.functions.showToast.exec;

			window.injected.map((func: Function) => func($this));
		}

		fetchUserMe() {
			const $this = this;

			return new Promise(async (resolve, reject) => {
				const { fetchUserMe } = $this.actions.auth;

				await fetchUserMe();

				const state = $this.getState();

				const { auth, users } = state;

				const { isLogin, user: userId } = auth;

				if (isLogin) {
					const { items } = users;

					const user = items[userId];

					user.userId = userId;

					delete user.id;

					resolve(user);
				}

				resolve(false);
			});
		}

		cleaning(usersIds: number[] = []) {
			const $this = this;

			const state = $this.getState();

			const { chats, subscribers, subscribes, users } = state;

			const { messages, messagesHasMore } = chats;

			[chats, subscribers, subscribes, users].map((item: any) => {
				const { items } = item;

				usersIds.map((userId: any) => {
					if ($this.model.userId != parseInt(userId)) {
						delete items[userId];
					}
				});

				Object.keys(items).map((userId: any) => {
					if ($this.model.userId != parseInt(userId)) {
						delete items[userId];
					}
				});
			});

			Object.keys(messagesHasMore).map((userId: any) => {
				if ($this.model.userId != parseInt(userId)) {
					delete messagesHasMore[userId];
				}
			});

			[messages].map((item: any) => {
				Object.keys(item).map((messageId: any) => {
					delete chats.messages[messageId];
				});
			});
		}
	}

	window.OFLib = new OFLib();
})();