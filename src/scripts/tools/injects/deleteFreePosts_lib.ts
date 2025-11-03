const deleteFreePosts = (OFLib: any) => {
	const url: any = new URL(location.href);

	if (!url.hashParams.has('deleteFreePosts')) return;

	const params = {
		limit: 50,
		more: false,
		beforePublishTime: undefined,
	};

	const observer = async () => {
		const response = await OFLib.fetchUserPosts(params);

		const {
			list,
			hasMore,
			beforePublishTime,
		} = response;

		const ts = parseInt(`${beforePublishTime.split('.')[0]}000`);

		const beforePublishTimeDate = new Date(ts);

		const freePosts: any[] = list;

		const freePosts_: any[] = list.filter((post: any) => {
			const { isPinned, price, text } = post;

			const el = document.createElement('div');

			el.innerHTML = text;

			const a = el.querySelector('a');

			if (a) {
				const { innerHTML } = a;

				if (!innerHTML.startsWith('@') && !isPinned && !price) return true;
			}

			if (!a && !isPinned && !price) return true;

			return false;
		});

		console.log(`Found posts ${freePosts.length}`);

		OFLib.cleaning();

		console.log(`Current date position ${beforePublishTimeDate}`);

		for (let i = 0; i < freePosts.length; i++) {
			const post = freePosts[i];

			const { id: postId } = post;

			await new Promise((resolve, reject) => {
				const observer = async () => {
					try {
						const response = await OFLib.deletePost(postId);

						resolve(response);

						return;
					} catch (error: any) {
						console.error(error);
					}

					new setTimeoutExt(observer, 100);
				};

				observer();
			});

			console.log(`Deleted post ${postId}`);
		}

		params.beforePublishTime = beforePublishTime;
		params.more = true;

		if (!hasMore) {
			console.log(`All done`);

			return;
		}

		new setTimeoutExt(observer, 100);
	};

	observer();

};

window.injected.push(deleteFreePosts);