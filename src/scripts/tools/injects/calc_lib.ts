window.injected.push((OFLib: any) => {
	class Parser {
		limit: number = 5;
		threads: number = 5;
		suspiciousScoreLimit: number = 10;

		settings: any = {
			promotions: {},
			campaigns: {},
			trials: {},
		};

		model: any;

		chats: any;

		constructor() {
			const $this = this;

			const url: any = new URL(location.href);

			if (!url.hashParams.has('calc')) return;

			const reset = url.hashParams.get('reset');

			const limit = parseInt(url.hashParams.get('limit')) || false;
			const threads = parseInt(url.hashParams.get('threads')) || false;
			const suspiciousScoreLimit = parseInt(url.hashParams.get('suspiciousScoreLimit')) || false;

			$this.limit = limit ? limit : $this.limit;
			$this.threads = threads ? threads : $this.threads;
			$this.suspiciousScoreLimit = suspiciousScoreLimit ? suspiciousScoreLimit : $this.suspiciousScoreLimit;

			const settings = reset ? {} : (() => {
				const item = localStorage.getItem('OFLibSettings');

				if (item) {
					return JSON.parse(item);
				}

				return {};
			})();

			Object.assign($this.settings, settings);

			$this.init();
		}

		async init() {
			const $this = this;

			new setIntervalExt(() => {
				$this.postMessage({ ping: new Date() });
			}, 1000);

			new setTimeoutExt(() => {
				location.reload();
			}, 24 * 60 * 60 * 1000);

			console.log('Parser init');

			const model = OFLib.model;

			if (model) {
				$this.model = model;

				const { promotions: _promotions } = model;

				const promotions = (() => {
					if (_promotions.length) {
						return _promotions.map((promotion: any, index: number, self: any[]) => {
							const { id: promotionId, hasRelatedPromo } = promotion;

							if (hasRelatedPromo) {
								const related = self.find((promotion: any) => {
									const { id: _promotionId } = promotion;

									if (_promotionId != promotionId) {
										return true;
									}
								});

								const { id: relatedId } = related;

								promotion.relatedId = relatedId;
							}

							promotion.promotionId = promotionId;

							promotion.userId = $this.model.userId;

							return { [promotionId]: promotion };
						}).reduce((acc: any, next: any) => {
							return Object.assign(acc, next);
						});
					}

					return [];
				})();

				Object.values(promotions).map((promotion: any) => {
					delete promotion.id;
				});

				const proms: any[] = [
					OFLib.fetchChats({
						filter: 'priority',
						limit: 10,
						more: false,
					}),
					$this.fetchCampaigns(),
					$this.fetchTrials(),
				];

				const result: any[] = await Promise.all(proms);

				const [chats, campaigns, trials] = result;

				$this.chats = chats;

				await $this.calculate({
					promotions,
					campaigns,
					trials
				});
			} else { }

			console.log('All calculators done');
		}

		async calculate(args: any) {
			const $this = this;

			const {
				promotions,
				campaigns,
				trials
			} = args;

			await Promise.all([
				$this.calculatePromotions(promotions),
				$this.calculateCamaigns(campaigns),
				$this.calculateTrials(trials),
			]);
		}

		async calculatePromotions(promotions: any) {
			const $this = this;

			const sorted = Object.values(promotions).sort((a: any, b: any) => {
				const { createdAt: createdAt_a } = a;

				const { createdAt: createdAt_b } = b;

				if (createdAt_a > createdAt_b) return -1;

				if (createdAt_a < createdAt_b) return 1;

				return 0;
			});

			// showToast(`Promotions ${sorted.length}`);

			for (let i = 0; i < sorted.length; i++) {
				const promotion: any = sorted[i];

				if (!$this.settings.promotions[promotion.promotionId]) {
					$this.settings.promotions[promotion.promotionId] = {
						offset: 0,
					};
				}

				const { claimsCount } = promotion;

				promotion.inboxes = 0;
				promotion.reads = 0;
				promotion.replies = 0;
				promotion.newFans = 0;
				promotion.newSpenders = 0;
				promotion.returnedFans = 0;
				promotion.returnedSpenders = 0;
				promotion.totalSumm = 0;
				promotion.suspicious = 0;

				promotion.parsed = 0;

				await $this.fetchClaimsPromotion(promotion);
			}

			console.log('Promotions calculated');

			// showToast('Promotions calculated');
		}

		async calculateCamaigns(campaigns: any) {
			const $this = this;

			const sorted = Object.values(campaigns).sort((a: any, b: any) => {
				const { createdAt: createdAt_a } = a;

				const { createdAt: createdAt_b } = b;

				if (createdAt_a > createdAt_b) return -1;

				if (createdAt_a < createdAt_b) return 1;

				return 0;
			});

			// showToast(`Campaigns ${sorted.length}`);

			for (let i = 0; i < sorted.length; i += $this.threads) {
				const chunk = sorted.slice(i, i + $this.threads);

				const proms = chunk.map((campaign: any) => {
					if (!$this.settings.campaigns[campaign.campaignId]) {
						$this.settings.campaigns[campaign.campaignId] = {
							offset: 0,
						};
					}

					const { countSubscribers } = campaign;

					campaign.newFans = 0;
					campaign.inboxes = 0;
					campaign.reads = 0;
					campaign.replies = 0;
					campaign.newSpenders = 0;
					campaign.totalSumm = 0;
					campaign.suspicious = 0;

					campaign.parsed = 0;

					return $this.fetchClaimsCampaign(campaign);
				});

				await Promise.all(proms);
			}

			console.log('Campaigns calculated');

			// showToast('Campaigns calculated');
		}

		async calculateTrials(trials: any) {
			const $this = this;

			const sorted = Object.values(trials).sort((a: any, b: any) => {
				const { createdAt: createdAt_a } = a;

				const { createdAt: createdAt_b } = b;

				if (createdAt_a > createdAt_b) return -1;

				if (createdAt_a < createdAt_b) return 1;

				return 0;
			});

			// showToast(`Trials ${sorted.length}`);

			for (let i = 0; i < sorted.length; i += $this.threads) {
				const chunk = sorted.slice(i, i + $this.threads);

				const proms = chunk.map((trial: any) => {
					if (!$this.settings.trials[trial.trialId]) {
						$this.settings.trials[trial.trialId] = {
							offset: 0,
						};
					}

					const { claimCounts } = trial;

					trial.newFans = 0;
					trial.inboxes = 0;
					trial.reads = 0;
					trial.replies = 0;
					trial.stackers = 0;
					trial.newSpenders = 0;
					trial.totalSumm = 0;
					trial.suspicious = 0;

					trial.parsed = 0;

					return $this.fetchClaimsTrials(trial);
				});

				await Promise.all(proms);
			}

			console.log('Trials calculated');

			// showToast('Trials calculated');
		}

		fetchClaimsPromotion(promotion: any) {
			const $this = this;

			return new Promise((resolve, reject) => {
				const { fetchClaims } = OFLib.actions.statistic;

				const { offset } = $this.settings.promotions[promotion.promotionId];

				const params = {
					claim: {
						...promotion,
						id: promotion.promotionId
					},
					offset,
					// limit: $this.limit,
					limit: 10,
					more: offset ? true : false,
				};

				const observer = async () => {
					try {
						console.log(`Promotion ${promotion.promotionId} parsing... offset ${params.offset}`);

						const response = await queue.add(async () => await fetchClaims(params));

						const { list, hasMore } = response;

						const usersIds = list.map((user: any) => user.id);

						const proms = list.map((user: any) => {
							return new Promise(async (resolve, reject) => {
								const {
									id: userId,
									subscribedOnData,
								} = user;

								if (!subscribedOnData) {
									resolve(true);

									return;
								}

								if ($this.chats[userId]) {
									promotion.inboxes++;
									promotion.reads++;
									promotion.replies++;

									user.sendingMessages = true;
									user.readingMessagesFromModel = true;
									user.repliesMessages = true;
								} else {
									const response: any = await $this.fetchChatsMessages({
										userId,
										limit: 100,
									});

									const fromFan = Object.values(response).filter((message: any) => {
										const { fromUser } = message;

										return fromUser == userId;
									});

									if (fromFan.length) {
										promotion.inboxes++;

										user.sendingMessages = true;
									}

									const fromModel = Object.values(response).filter((message: any) => {
										const { fromUser } = message;

										return fromUser != userId;
									});

									const reads = fromModel.filter((message: any) => {
										const { isNew } = message;

										return !isNew;
									});

									if (reads.length) {
										promotion.reads++;

										user.readingMessagesFromModel = true;
									}

									if (fromFan.length && reads.length) {
										promotion.replies++;

										user.repliesMessages = true;
									}
								}

								const score = $this.calculateSuspiciousScore(user);

								if ($this.suspiciousScoreLimit < score) {
									promotion.suspicious++;
								}

								const { subscribes, totalSumm } = subscribedOnData;

								const returned = subscribes.find((subscribe: any) => {
									const { action } = subscribe;

									return 'return' == action;
								});

								if (returned) {
									promotion.returnedFans++;
								} else {
									promotion.newFans++;
								}

								if (totalSumm) {
									if (returned) {
										promotion.returnedSpenders++;
									} else {
										promotion.newSpenders++;
									}

									promotion.totalSumm += totalSumm;
								}

								resolve(true);
							});
						});

						await Promise.all(proms);

						promotion.parsed += list.length;

						$this.postMessage({
							promotions: {
								[promotion.promotionId]: promotion
							}
						});

						console.log(`Promotion ${promotion.promotionId} parsing... offset ${params.offset} stored`);

						// params.offset += list.length;
						params.offset += 10;
						params.more = true;

						$this.settings.promotions[promotion.promotionId].offset = params.offset;

						localStorage.setItem('OFLibSettings', JSON.stringify($this.settings));

						OFLib.cleaning(usersIds);

						if (!hasMore) {
							delete $this.settings.promotions[promotion.promotionId];

							localStorage.setItem('OFLibSettings', JSON.stringify($this.settings));

							promotion.lastParseDate = new Date().toJSON();

							$this.postMessage({
								promotions: {
									[promotion.promotionId]: promotion,
								}
							});

							console.log(`Promotion ${promotion.promotionId} parsed at ${promotion.lastParseDate}`);

							// showToast(`Promotion ${promotion.promotionId} parsed at ${promotion.lastParseDate}`);

							resolve(true);

							return;
						}
					} catch (error: any) {
						console.error(error);

						console.log(`Promotion ${promotion.promotionId} parsing... offset ${params.offset} restart`);
					}

					new setTimeoutExt(observer, 100);
				};

				observer();
			});
		}

		fetchClaimsCampaign(campaign: any) {
			const $this = this;

			return new Promise((resolve, reject) => {
				const { fetchCampaignClaimers } = OFLib.actions.campaigns;

				const { offset } = $this.settings.campaigns[campaign.campaignId];

				const params = {
					id: campaign.campaignId,
					offset,
					// limit: $this.limit,
					limit: 10,
					more: offset ? true : false,
				};

				const observer = async () => {
					try {
						console.log(`Campaign ${campaign.campaignId} parsing... offset ${params.offset}`);

						const response = await queue.add(async () => await fetchCampaignClaimers(params));

						const { list, hasMore } = response;

						const usersIds = list.map((user: any) => user.id);

						const list_f: any[] = [];

						{
							for (let i = 0; i < usersIds.length; i += 20) {
								const chunk = usersIds.slice(i, i + 20);

								const params = {
									ids: {
										f: chunk,
									},
								};

								const response = await queue.add(async () => await OFLib.getUsersByIds(params));

								Object.values(response).map((user: any) => {
									list_f.push(user);
								});
							}
						}

						const proms = list_f.map((user: any) => {
							return new Promise(async (resolve, reject) => {
								const {
									id: userId,
									subscribedOnData,
								} = user;

								if (!subscribedOnData) {
									resolve(true);

									return;
								}

								if ($this.chats[userId]) {
									campaign.inboxes++;
									campaign.reads++;
									campaign.replies++;

									user.sendingMessages = true;
									user.readingMessagesFromModel = true;
									user.repliesMessages = true;
								} else {
									const response: any = await $this.fetchChatsMessages({
										userId,
										limit: 100,
									});

									const fromFan = Object.values(response).filter((message: any) => {
										const { fromUser } = message;

										return fromUser == userId;
									});

									if (fromFan.length) {
										campaign.inboxes++;

										user.sendingMessages = true;
									}

									const fromModel = Object.values(response).filter((message: any) => {
										const { fromUser } = message;

										return fromUser != userId;
									});

									const reads = fromModel.filter((message: any) => {
										const { isNew } = message;

										return !isNew;
									});

									if (reads.length) {
										campaign.reads++;

										user.readingMessagesFromModel = true;
									}

									if (fromFan.length && reads.length) {
										campaign.replies++;

										user.repliesMessages = true;
									}
								}

								const score = $this.calculateSuspiciousScore(user);

								if ($this.suspiciousScoreLimit < score) {
									campaign.suspicious++;
								}

								const { subscribes, totalSumm } = subscribedOnData;

								const subscriber = subscribes.find((subscribe: any) => {
									const { action, type, offerStart } = subscribe;

									return 'subscribe' == action && 'regular' == type;
								});

								if (!subscribes.length || subscriber) {
									campaign.newFans++;
								}

								if (totalSumm) {
									if (!subscribes.length || subscriber) {
										campaign.newSpenders++;

										campaign.totalSumm += totalSumm;
									}
								}

								resolve(true);
							});
						});

						await Promise.all(proms);

						campaign.parsed += list.length;

						$this.postMessage({
							campaigns: {
								[campaign.campaignId]: campaign
							}
						});

						console.log(`Campaign ${campaign.campaignId} parsing... offset ${params.offset} stored`);

						// params.offset += list.length;
						params.offset += 10
						params.more = true;

						$this.settings.campaigns[campaign.campaignId].offset = params.offset;
						localStorage.setItem('OFLibSettings', JSON.stringify($this.settings));

						OFLib.cleaning(usersIds);

						if (!hasMore) {
							delete $this.settings.campaigns[campaign.campaignId];
							localStorage.setItem('OFLibSettings', JSON.stringify($this.settings));

							campaign.lastParseDate = new Date().toJSON();

							$this.postMessage({
								campaigns: {
									[campaign.campaignId]: campaign
								}
							});

							console.log(`Campaign ${campaign.campaignId} parsed at ${campaign.lastParseDate}`);

							// showToast(`Campaign ${campaign.campaignId} parsed at ${campaign.lastParseDate}`);

							resolve(true);

							return;
						}
					} catch (error: any) {
						console.error(error);

						console.log(`Campaign ${campaign.campaignId} parsing... offset ${params.offset} restart`);
					}

					new setTimeoutExt(observer, 100);
				};

				observer();
			});
		}

		fetchClaimsTrials(trial: any) {
			const $this = this;

			return new Promise((resolve, reject) => {
				const { fetchClaims } = OFLib.actions.statistic;

				const { createdAt } = trial;

				const { offset } = $this.settings.trials[trial.trialId];

				const params = {
					claim: {
						...trial,
						kind: 'trial',
						id: trial.trialId
					},
					offset,
					// limit: $this.limit,
					limit: 10,
					more: false,
				};

				const observer = async () => {
					try {
						console.log(`Trial ${trial.trialId} parsing... offset ${params.offset}`);

						const response = await queue.add(async () => await fetchClaims(params));

						const { list, hasMore } = response;

						const usersIds = list.map((user: any) => user.id);

						const proms = list.map((user: any) => {
							return new Promise(async (resolve, reject) => {
								const {
									id: userId,
									subscribedOnData
								} = user;

								if (!subscribedOnData) {
									resolve(true);

									return;
								}

								if ($this.chats[userId]) {
									trial.inboxes++;
									trial.reads++;
									trial.replies++;

									user.sendingMessages = true;
									user.readingMessagesFromModel = true;
									user.repliesMessages = true;
								} else {
									const response: any = await $this.fetchChatsMessages({
										userId,
										limit: 100,
									});

									const fromFan = Object.values(response).filter((message: any) => {
										const { fromUser } = message;

										return fromUser == userId;
									});

									if (fromFan.length) {
										trial.inboxes++;

										user.sendingMessages = true;
									}

									const fromModel = Object.values(response).filter((message: any) => {
										const { fromUser } = message;

										return fromUser != userId;
									});

									const reads = fromModel.filter((message: any) => {
										const { isNew } = message;

										return !isNew;
									});

									if (reads.length) {
										trial.reads++;

										user.readingMessagesFromModel = true;
									}

									if (fromFan.length && reads.length) {
										trial.replies++;

										user.repliesMessages = true;
									}
								}

								const score = $this.calculateSuspiciousScore(user);

								if ($this.suspiciousScoreLimit < score) {
									trial.suspicious++;
								}

								const { subscribes, totalSumm } = subscribedOnData;

								const subscriber = subscribes.find((subscribe: any) => {
									const { action, type, offerStart } = subscribe;

									return 'subscribe' == action && 'trial' == type && offerStart == createdAt;
								});

								const stacker = subscribes.find((subscribe: any) => {
									const { action, type, offerStart } = subscribe;

									return 'subscribe' != action && 'trial' == type && offerStart == createdAt;
								});

								if (!subscribes.length || subscriber) {
									trial.newFans++;
								}

								if (stacker) {
									trial.stackers++;
								}

								if (totalSumm) {
									if (!subscribes.length || subscriber) {
										trial.newSpenders++;

										trial.totalSumm += totalSumm;
									}
								}

								resolve(true);
							});
						});

						await Promise.all(proms);

						trial.parsed += list.length;

						$this.postMessage({
							trials: {
								[trial.trialId]: trial
							}
						});

						console.log(`Trial ${trial.trialId} parsing... offset ${params.offset} stored`);

						// params.offset += list.length;
						params.offset += 10;
						params.more = true;

						$this.settings.trials[trial.trialId].offset = params.offset;
						localStorage.setItem('OFLibSettings', JSON.stringify($this.settings));

						OFLib.cleaning(usersIds);

						if (!hasMore) {
							delete $this.settings.trials[trial.trialId];
							localStorage.setItem('OFLibSettings', JSON.stringify($this.settings));

							trial.lastParseDate = new Date().toJSON();

							$this.postMessage({
								trials: {
									[trial.trialId]: trial
								}
							});

							console.log(`Trial ${trial.trialId} parsed at ${trial.lastParseDate}`);

							// showToast(`Trial ${trial.trialId} parsed at ${trial.lastParseDate}`);

							resolve(true);

							return;
						}
					} catch (error: any) {
						console.error(error);

						console.log(`Trial ${trial.trialId} parsing... offset ${params.offset} restart`);
					}

					new setTimeoutExt(observer, 100);
				};

				observer();
			});
		}

		postMessage(args: any) {
			const $this = this;

			const OFLibOutbox = {
				model: $this.model,
				...args,
			};

			window.postMessage({ OFLibOutbox });
		}

		fetchChatsMessages(params: any) {
			const $this = this;

			return new Promise(async (resolve, reject) => {
				const result: any = {};

				try {
					const { fetchChatsMessages } = OFLib.actions.chats;

					const { userId } = params;

					const response = await fetchChatsMessages(params);

					const state = OFLib.getState();

					const { chats } = state;

					const { messages } = chats;

					Object.values(messages).filter((message: any) => {
						const { chatId } = message;

						if (chatId && chatId == userId) return true;

						return false;
					}).map((message: any) => {
						const { id: messageId } = message;

						result[messageId] = message;
					});

					OFLib.app.$router.replace({
						name: 'faq',
						hash: '#calc',
					});
				} catch (error: any) {
					console.error(error);
				}

				resolve(result);
			});
		}

		fetchCampaigns() {
			const $this = this;

			return new Promise((resolve, reject) => {
				const { fetchCampaigns } = OFLib.actions.campaigns;

				const params = {
					limit: 100,
					offset: 0,
					more: false,
				};

				const campaigns: any = {};

				const observer = async () => {
					try {
						const response = await queue.add(async () => await fetchCampaigns(params));

						const { list, hasMore } = response;

						list.map((campaign: any) => {
							const { id: campaignId } = campaign;

							campaign.campaignId = campaignId;

							delete campaign.id;

							campaign.userId = $this.model.userId;

							campaigns[campaignId] = campaign;

							return campaignId;
						});

						params.offset += 100;
						params.more = true;

						if (!hasMore) {
							resolve(campaigns);

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

		fetchTrials() {
			const $this = this;

			return new Promise((resolve, reject) => {
				const { fetchTrials } = OFLib.actions.subscribers;

				const params = {
					limit: 100,
					offset: 0,
					more: false,
				};

				const trials: any = {};

				const observer = async () => {
					try {
						const response = await queue.add(async () => await fetchTrials(params));

						const { list, hasMore } = response;

						list.map((trial: any) => {
							const { id: trialId } = trial;

							trial.trialId = trialId;

							delete trial.id;

							trial.userId = $this.model.userId;

							trials[trialId] = trial;

							return trialId;
						});

						params.offset += 100;
						params.more = true;

						if (!hasMore) {
							resolve(trials);

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

		calculateSuspiciousScore(user: any) {
			const $this = this;

			const {
				id: userId,
				about, // Text about
				avatar, // Url to pic or null
				favoritedCount, // He follows them
				favoritesCount, // His fans
				lastSeen, // He was on site this date
				joinDate, // He registered on site
				name, // Text name
				username, // Can be like u${userId}, or he can set by self
				sendingMessages, // He sending messages
				readingMessagesFromModel, // He reading messages
				repliesMessages, // He answers to messages
			} = user;

			let suspiciousScore = 0;
			const now = new Date();

			// --- 1. Анализ полноты профиля (ваш базовый вариант, но с другими весами) ---
			if (!about) suspiciousScore += 1; // Нет описания
			if (!avatar) suspiciousScore += 2; // Нет аватара - это более сильный признак
			if (!name || name === username) suspiciousScore += 1; // Нет имени или оно совпадает с логином

			// --- 2. Анализ username ---
			// Проверяем, выглядит ли username как сгенерированный по умолчанию (u + цифры)
			if (/^u\d+$/.test(username)) {
				suspiciousScore += 5; // Это очень сильный флаг!
			}

			// --- 3. Анализ социальных связей ---
			// Неестественное соотношение подписок/подписчиков
			const socialRatio = favoritesCount / (favoritedCount || 1); // Делим на 1, чтобы избежать деления на ноль

			if (favoritedCount > 100 && socialRatio < 0.1) {
				// Подписан на >100, а отдача <10% - типичный массфолловер/спамер
				suspiciousScore += 5;
			}

			if (favoritedCount > 1000 && socialRatio < 0.05) {
				// Экстремальный случай массфолловинга
				suspiciousScore += 10;
			}

			if (favoritedCount > 50 && favoritesCount === 0) {
				// Подписался на многих, но не получил ни одного подписчика в ответ
				suspiciousScore += 3;
			}

			// --- 4. Анализ возраста и активности ---
			const accountAgeInDays = (now.getTime() - new Date(joinDate).getTime()) / (1000 * 60 * 60 * 24);

			if (accountAgeInDays < 7) {
				// Аккаунт очень свежий
				suspiciousScore += 2;

				// Свежий аккаунт с ненормальной активностью
				if (favoritedCount > 500) {
					suspiciousScore += 10; // За неделю подписаться на 500+ человек - почти наверняка бот
				}
			}

			// --- 5. АНАЛИЗ ПОВЕДЕНИЯ В ПЕРЕПИСКЕ (Булевы значения) ---

			if (repliesMessages) {
				// САМЫЙ СИЛЬНЫЙ ПРИЗНАК ЧЕЛОВЕКА: он ведет диалог.
				// Снижаем подозрительность, даже если профиль пустой.
				suspiciousScore -= 5;
			} else if (sendingMessages) {
				// Пользователь отправлял сообщения, но не отвечал.
				// Это подозрительная, односторонняя коммуникация.

				if (readingMessagesFromModel) {
					// Он хотя бы читает входящие. Это смешанный сигнал.
					suspiciousScore += 3;
				} else {
					// Классический спамер: отправляет в пустоту, не читая и не отвечая.
					// Это очень сильный флаг бота.
					suspiciousScore += 10;
				}
			} else if (readingMessagesFromModel) {
				// Он ничего не отправлял, но читал. Типичный "читатель".
				// Это хороший знак.
				suspiciousScore -= 2;
			}
			// Если все три флага false, ничего не делаем. Пользователь просто неактивен в чатах.

			// --- 6. АНАЛИЗ ЖИЗНЕННОГО ЦИКЛА АККАУНТА (lastSeen) ---
			if (lastSeen) {
				const daysSinceLastSeen = (now.getTime() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24);

				// Правило "Ветеран": старый аккаунт, который активен до сих пор
				if (accountAgeInDays > 180 && daysSinceLastSeen < 7) {
					suspiciousScore -= 10; // Самый сильный оправдательный признак
				}

				// Правило "Бот-однодневка": зарегистрировался, сделал свои дела и пропал
				const accountLifetimeInDays = (new Date(lastSeen).getTime() - new Date(joinDate).getTime()) / (1000 * 60 * 60 * 24);
				if (accountAgeInDays < 3 && accountLifetimeInDays < 1 && favoritedCount > 50) {
					// Если аккаунту меньше 3 дней, вся его жизнь уложилась в 1 день, и он успел натворить дел
					suspiciousScore += 7;
				}

				// Правило "Заброшенный аккаунт": неактивен более полугода
				if (daysSinceLastSeen > 180) {
					// Уменьшаем итоговый счет вдвое, так как угроза неактуальна
					suspiciousScore = Math.floor(suspiciousScore / 2);
				}
			}

			// Убедимся, что счет не ушел в минус
			return Math.max(0, suspiciousScore);
		}
	}

	new Parser();
});