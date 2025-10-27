const deleteFreePosts = (OFLib: any) => {
	const url: any = new URL(location.href);

	if (!url.hashParams.has('deleteFreePosts')) return;

	const { id: userId } = OFLib.model;

	const { fetchUserPosts, deletePost } = OFLib.actions.posts;

	const params = {
		id: userId,
		limit: 50,
		more: false,
		beforePublishTime: undefined,
	};

	const observer = async () => {
		const response = await fetchUserPosts(params);

		const state = OFLib.getState();

		const { posts } = state;

		const { items, beforePublishTime, hasMore } = posts;

		const { posts: postsHasMore } = hasMore;

		const ts = parseInt(`${beforePublishTime.split('.')[0]}000`);

		const beforePublishTimeDate = new Date(ts);

		const freePosts: any[] = Object.values(items).filter((post: any) => {
			const { isPinned, price, text } = post;

			const el = document.createElement('div');

			el.innerHTML = text;

			const a = el.querySelector('a');

			if (a) {
				const {innerHTML} = a;

				if (!innerHTML.startsWith('@') && !isPinned && !price) return true;
			}

			if (!a && !isPinned && !price) return true;

			return false;
		});

		console.log(`Found posts ${freePosts.length}`);

		posts.itemIds = [];
		posts.items = {};

		OFLib.cleaning();

		console.log(`Current date position ${beforePublishTimeDate}`);

		for (let i = 0; i < freePosts.length; i++) {
			const post = freePosts[i];

			const { id: postId } = post;

			await new Promise((resolve, reject) => {
				const observer = async () => {
					try {
						const response = await deletePost(postId);

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

		if (!postsHasMore) {
			console.log(`All done`);

			return;
		}

		new setTimeoutExt(observer, 100);
	};

	observer();

};

window.injected.push(deleteFreePosts);