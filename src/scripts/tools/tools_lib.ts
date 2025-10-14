window.injected.push((OFLib: any) => {
	console.log('Tools');

	(async () => {
		const priorityUsers: any = await OFLib.fetchChats({
			filter: 'priority',
			limit: 10,
			more: false,
		});

		const users: any = await OFLib.fetchChats({
			filter: 'unread',
			limit: 10,
			more: false,
		});

		Object.keys(priorityUsers).map((userId: any) => {
			delete users[userId];
		});

		const rows = Object.keys(users).map((userId: any) => {
			return `https://onlyfans.com/my/chats/chat/${userId}/?q=Usename`;
		}).join("\n");

		console.log(rows);
	})()
});