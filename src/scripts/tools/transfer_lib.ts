window.injected.push(async (OFLib: any) => {
	const listId = 0;

	const url: any = new URL(location.href);

	if (!url.hashParams.has('transfer')) return;

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
				const { listsStates, subscribedOnData, subscribedOnExpiredNow } = user;

				const found = listsStates.find((listState: any) => {
					const {id: listId_, canAddUser,} = listState

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

			params.offset += list.length;
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
});