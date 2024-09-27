import { User } from "../../Providers/UserContext/User";

export const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';

export function validateFile(file: File): boolean {
  if (!file) return false;

  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.');
    return false;
  }

  const maxSizeInMB = 5;
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    alert('File size exceeds 5MB. Please select a smaller file.');
    return false;
  }
  return true;
};

export function trimMessage(message: string | undefined): string {
	if (!message) return ("");

	const trimmedMessage = message
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.join('\n');

	return (trimmedMessage);
}

export function getFullname(user: User | undefined): string {
	if (!user) return ('Unknown');

	return (`${user?.nameFirst} ${user?.nameLast}`);
}

export function getUsername(user: User | undefined): string {
	if (!user) return ('Unknown');

  return (user.nameNick || getFullname(user));
};

export function onFileUpload(
	file: File,
	changeChannelData: (newData: Partial<any>) => void,
	setAvatarSrc: (value: React.SetStateAction<string | undefined>) => void)
{
	if (!validateFile(file)) return;

	changeChannelData({ image: file });
	const reader = new FileReader();
	reader.onloadend = () => {
		setAvatarSrc(reader?.result as string);
	};
	reader.readAsDataURL(file);
};

export function handleError(message: string, error: any) {
	if (!error) {
		alert(message);
	} else {
		const errorMessage = error?.response?.data ? error.response.data.message : error

		alert(`${message} ${errorMessage}`);
	}
}
