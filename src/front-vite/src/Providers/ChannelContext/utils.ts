import { ChannelFilters, ChannelMember, ChannelType, DataUpdateType, formatDateType, UpdateType } from "./Types";

export function getChannelTypeFromFilter(filter: ChannelFilters) {
	return (filter === ChannelFilters.protected ? ChannelType.protected : ChannelType.public);
}


export function updateMap<Type extends { id: number }>(
	map: Map<number, Type>,
	data: DataUpdateType<Type>
): Map<number, Type> {
	const updatedMap = new Map(map);

	switch (data.updateType) {
		case UpdateType.updated:
			if (data.content) {
				updatedMap.set(data.content.id, data.content);
			}
			break;
		default:
			console.log(updatedMap.values(), data);
			updatedMap.delete(data.content.id);
			break;
	}
	return (updatedMap);
}

export function updatePropArray<Type>(prevArray: Type[], newData: DataUpdateType<any>): Type[] {
	const index = prevArray.findIndex((prevArray: any) => prevArray.id === newData.content?.id)
	if (index === -1) {
		if (newData.updateType === UpdateType.updated) {
			return ([...prevArray, newData.content as Type]);
		}
		return ([...prevArray]);
	}

	let updatedArray = [...prevArray];
	if (newData.updateType === UpdateType.updated) {
		updatedArray[index] = newData.content as Type;
	} else {
		updatedArray.splice(index, 1);
	}
	return (updatedArray);
}

export function getMembershipbyChannel(memberships: ChannelMember[], channelId: number): ChannelMember | undefined {
	return (memberships.find((membership) => membership.channel.id === channelId));
}

export function formatDate(timestamp: Date): formatDateType {
  const now: Date = new Date();
  const date: Date = new Date(timestamp);
	let particle: string = '';

  const formattedTime = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  let formattedDate = date.toLocaleDateString('en-UK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth()
  ) {
    const dayNow = now.getDate();
    const dayDate = date.getDate();

    if (dayNow === dayDate) {
      formattedDate = 'Today';
			particle = 'at';
    } else if (dayNow - 1 === dayDate) {
      formattedDate = 'Yesterday';
			particle = 'at';
    }
  }
  return { date: formattedDate, particle, time: formattedTime };
};

export function getTimeDiff(timestamp1: Date, timestamp2: Date) {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);

	if (timestamp1 > timestamp2) {
		return (date1.getTime() - date2.getTime());
	}
	return (date2.getTime() - date1.getTime());
};

export function isDiffDate(date1: Date, date2: Date): boolean {
  const normalizedDate1 = new Date(date1);
  const normalizedDate2 = new Date(date2);
  normalizedDate1.setHours(0, 0, 0, 0);
  normalizedDate2.setHours(0, 0, 0, 0);

  return (normalizedDate1.getTime() !== normalizedDate2.getTime());
}

const RETRY_DELAY = 1000;
export async function retryOperation (operation: () => Promise<any>, retries = 3): Promise<any> {
	for (let attempt = 1;; ++attempt) {
		try {
			return (await operation());
		} catch (error: any) {
			if (error.response){
				const statusCode = error.response.status;
				if (statusCode < 500 || statusCode > 600) {
					throw error;
				}
			}

			if (attempt < retries) {
				console.warn(`Attempt ${attempt} failed, retrying in ${RETRY_DELAY}ms...`);
				await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
			} else {
				throw error;
			}
		}
	}
}
