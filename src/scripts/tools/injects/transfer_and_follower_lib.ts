const transferFreebies = async (OFLib: any) => {
	const url: any = new URL(location.href);

	if (!url.hashParams.has('transfer')) return;

	const listId = 0;

	if (!listId) return;

	const { userId } = OFLib.model;

	const { saveUsersListOrder } = OFLib.actions.usersLists;

	{
		const params = {
			listId: 'fans',
			data: {
				// order: "subscribe_date",
				order: "last_activity",
				direction: "desc",
				type: "all"
			}
		};

		const sorted = await new Promise((resolve, reject) => {
			const observer = async () => {
				try {
					await saveUsersListOrder(params);

					resolve(true);

					return;
				} catch (error: any) {
					console.error(error);
				}

				new setTimeoutExt(observer, 100);
			};
			observer();
		});
	}

	const { fetchSubscribers } = OFLib.actions.subscribers;

	const params = {
		more: false,
		offset: (() => {
			const item = localStorage.getItem('transferOffset');

			if (item) {
				return parseInt(item);
			}

			return 0;
		})(),
		query: '',
		type: 'all'
	};

	const observer = async () => {
		try {
			const response = await queue.add(async () => await fetchSubscribers(params));

			const { list, hasMore } = response;

			const filtered = list.filter((user: any) => {
				const { subscribedOnData } = user;

				if (subscribedOnData) return 1;

				return 0;
			}).filter((user: any) => {
				const { listsStates, subscribedOnData, subscribedOnExpiredNow } = user;

				const found = listsStates.find((listState: any) => {
					const { id: listId_, canAddUser, } = listState

					if (listId_ === listId && !canAddUser) return 1;

					return 0;
				});

				if (found) return 0;

				const { subscribeAt, totalSumm } = subscribedOnData;

				const subscribeAtDate = new Date(subscribeAt);

				const currentDate = new Date();

				const diff = (currentDate.getTime() - subscribeAtDate.getTime()) / 1000 / 60 / 60 / 24;

				if (subscribedOnExpiredNow && 0 == totalSumm && 60 < diff) {
					return 1;
				}

				return 0;
			}).map((user: any) => user.id);

			{
				if (listId && filtered.length) {
					const { addUsersToLists } = OFLib.actions.usersLists;

					const params = {
						data: {
							[listId]: filtered,
						},
						updateFriendsList: false,
					};

					try {
						const response = await queue.add(async () => await addUsersToLists(params));

						debugger;
					} catch (error: any) {
						console.error(error);
					}
				}
			}

			OFLib.cleaning();

			params.offset += 10;
			params.more = true;

			localStorage.setItem('transferOffset', String(params.offset));

			if (!hasMore) {
				return;
			}
		} catch (error: any) {
			console.error(error);
		}

		new setTimeoutExt(observer, 100);
	};

	observer();
};

const transferSpenders = async (OFLib: any) => {
	const url: any = new URL(location.href);

	if (!url.hashParams.has('transfer')) return;

	const { userId } = OFLib.model;

	const settings = {
		24604311: [
			{
				listId: 894619783, // 🍓 SPENDERS ❤️
				minSumm: 0,
			}, {
				listId: 1001259042, // VIP $20 🍓
				minSumm: 20,
			}
		],
	};

	const params = {
		limit: 100,
		more: false,
	};

	const processed = {};

	const observer = async () => {
		try {
			const response = await queue.add(async () => await OFLib.fetchEarnings(params));

			if (response.length) {
				const lastTransaction = response[0];

				const { createdAt } = lastTransaction;

				console.log(`Current transaction date: ${new Date(createdAt)}`);

				const filtered = [...new Set(response.filter((transaction: any) => {
					const { user } = transaction;

					const { id: userId } = user;

					if (!processed[userId]) {
						return true;
					}

					return false;
				}).map((transaction: any) => {
					const { user } = transaction;

					const { id: userId } = user;

					return userId;
				}))];

				for (let i = 0; i < filtered.length; i += 20) {
					const chunk = filtered.slice(i, i + 20);

					const response = await queue.add(async () => await OFLib.getUsersByIds({
						ids: {
							f: chunk,
						}
					}));

					const proms = Object.keys(settings).filter((userId_: any) => {
						return userId == userId_;
					}).map((userId: any) => {
						const lists = settings[userId];

						const proms = lists.map(async (list: any) => {
							const { listId, minSumm } = list;

							const notInList = Object.keys(response).filter((userId: any) => {
								const user = response[userId];

								const { isBlocked, isRestricted, listsStates, subscribedOnData } = user;

								if (isBlocked) return false;

								if (isRestricted) return false;

								if (subscribedOnData) {
									const { totalSumm } = subscribedOnData;

									if (minSumm > totalSumm) return false;
								}

								const found = listsStates.find((listState: any) => {
									const { id: listId_, canAddUser } = listState;

									return listId == listId_ && !canAddUser;
								});

								return !found;
							}).map((userId: any) => parseInt(userId));

							if (notInList.length) {
								const { addUsersToLists } = OFLib.actions.usersLists;

								const params = {
									data: {
										[listId]: notInList,
									},
									updateFriendsList: false,
								};

								await new Promise((resolve, reject) => {
									const observer = async () => {
										try {
											const response = await queue.add(async () => await addUsersToLists(params));

											resolve(true);

											return;
										} catch (error: any) {
											console.error(error);
										}

										new setTimeoutExt(observer, 100);
									};

									observer();
								});

								console.log(`Transfered users: ${notInList.length}`);
							}

							return notInList.length;
						});

						return Promise.all(proms);
					});

					const result = new Set(...await Promise.all(proms));

					if (1 == result.size) {
						// return;
					}

					Object.keys(response).map((userId: any) => {
						processed[userId] = true;
					});
				}

				OFLib.cleaning();

				params.more = true;
			} else {
				return;
			}
		} catch (error: any) {
			console.error(error);
		}

		new setTimeoutExt(observer, 100);
	};

	observer();
}

const follower = async (OFLib: any) => {
	const url: any = new URL(location.href);

	if (!url.hashParams.has('follower')) return;

	const { saveUsersListOrder } = OFLib.actions.usersLists;

	{
		const params = {
			listId: 'fans',
			data: {
				// order: "subscribe_date",
				order: "last_activity",
				direction: "desc",
				type: "all"
			}
		};

		const sorted = await new Promise((resolve, reject) => {
			const observer = async () => {
				try {
					await saveUsersListOrder(params);

					resolve(true);

					return;
				} catch (error: any) {
					console.error(error);
				}

				new setTimeoutExt(observer, 100);
			};
			observer();
		});
	}

	const { fetchSubscribers } = OFLib.actions.subscribers;

	const params = {
		more: false,
		offset: 0,
		query: '',
		type: 'all'
	};

	const observer = async () => {
		try {
			const response = await queue.add(async () => await fetchSubscribers(params));

			const { list, hasMore } = response;

			const filtered = list.filter((user: any) => {
				const { subscribedOnData } = user;

				if (subscribedOnData) return 1;

				return 0;
			}).filter((user: any) => {
				const {
					canAddSubscriber,
					subscribePrice,
					subscribedBy,
					subscribedOnData,
					subscribedOnExpiredNow
				} = user;

				return canAddSubscriber && !subscribePrice && !subscribedBy;

				return 0;
			}).map((user: any) => user.id);

			console.log(`Ready for following ${filtered.length}...offset ${params.offset}`);

			for (let i = 0; i < filtered.length; i++) {
				const userId = filtered[i];

				const result = await OFLib.doSubscribe(userId);

				console.log(`Followed ${userId}`);
			}

			OFLib.cleaning();

			params.offset += 10;
			params.more = true;

			if (!hasMore) {
				return;
			}
		} catch (error: any) {
			console.error(error);
		}

		new setTimeoutExt(observer, 100);
	};

	observer();
};

// window.injected.push(transferFreebies);
window.injected.push(transferSpenders);
window.injected.push(follower);