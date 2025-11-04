const setMeToStream = async (OFLib: any) => {
	OFLib.getFunctions();

	//--------------------------------------------------------------

	const { exec: onStreamAvailabilityClick } = OFLib.functions.onStreamAvailabilityClick;

	onStreamAvailabilityClick();

	const { exec: onResetAvailableTo } = OFLib.functions.onResetAvailableTo;
	onResetAvailableTo();

	const { exec: setAvailability } = OFLib.functions.setAvailability;

	setAvailability({
		includeListIds: [],
		scheduledSubscribedOn: "",
		excludedSubscribers: [],
		usersCount: null,
		excludeListIds: [
1237265492,
1237265469,
		],
		subscribersIds: [
		],
		manuallyCheckedUserIds: [
		],
	});

	const observer = () => {
		OFLib.getFunctions();

		if (OFLib.functions.onApplyClick) {
			const { exec: onApplyClick } = OFLib.functions.onApplyClick;

			onApplyClick();

			return;
		}

		new setTimeoutExt(observer, 100);
	};

	observer();

	//--------------------------------------------------------------

	const { exec: setStreamData } = OFLib.functions.setStreamData;

	setStreamData({
		description: 'Tip me and get my very BRAND NEW video 🔞💦 + FREE ACCESS to my PAID PAGE 🎁',
	});
};