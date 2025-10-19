window.injected.push(async (OFLib: any) => {
	const url: any = new URL(location.href);

	if (!url.hashParams.has('chats')) return;

	console.log('Tools');

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

	console.log(`Shows only users not in priority`);

	const rows = Object.keys(users).map((userId: any) => {
		return `https://onlyfans.com/my/chats/chat/${userId}/?q=Usename`;
	}).join("\n");

	console.log(rows);
});