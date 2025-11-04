const cleanMyVault = (OFLib: any) => {
	const url: any = new URL(location.href);

	if (!url.hashParams.has('cleanMyVault')) return;

	const { fetchMediaVaultByType, hideMediaVaultByIds, fetchVaultLists, deleteVaultList } = OFLib.actions.mediaVault;

	{
		const params = {
			limit: 100,
			view: 'main',
		};

		const observer = async () => {
			const response = await fetchVaultLists(params);

			const state = OFLib.getState();

			const {mediaVault} = state;

			const {vaultLists} = mediaVault;

			const lists = Object.values(vaultLists).filter((item: any) => {
				const {type} = item;

				return 'custom' == type;
			});

			for (let i = 0; i < lists.length; i++) {
				const list: any = lists[i];

				const {id: listId} = list;

				const response = await deleteVaultList({
					id: listId,
				});
			}

			if (!lists.length) {
				return;
			}

			new setTimeoutExt(observer, 100);
		};

		observer()
	}

	{
		const params = {
			limit: 100,
			more: false,
		};

		let hidden = 0;

		const observer = async () => {
			const response = await fetchMediaVaultByType(params);

			const { list, hasMore } = response;

			for (let i = 0; i < list.length; i += 40) {
				const chunk = list.slice(i, i + 40);

				const ids = chunk.map((item: any) => {
					const { id: itemId } = item;

					return itemId;
				});

				const response = await hideMediaVaultByIds(ids);
			}

			hidden += list.length;

			console.log(`Removed items ${hidden}`);

			if (!hasMore) {
				return;
			}

			new setTimeoutExt(observer, 100);
		};

		observer();
	}

};

window.injected.push(cleanMyVault);