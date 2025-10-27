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
			1217119850,
			1217078201,
		],
		subscribersIds: [
			3423234
		],
		manuallyCheckedUserIds: [
			3423234
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