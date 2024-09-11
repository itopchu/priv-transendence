import { User } from "../../Providers/UserContext/User";

export const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';

const RETRY_DELAY = 1000;

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

export function getUsername(user: User): string {
  return user.nameNick || `${user.nameFirst} ${user.nameLast}`;
};

export const handleError = (message: string, error: any) => {
	if (!error) {
		alert(message);
	} else {
		const errorMessage = error?.response?.data ? error.response.data.message : error

		alert(`${message} ${errorMessage}`);
	}
}

export const retryOperation = async (operation: () => Promise<any>, retries = 3): Promise<any> => {
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
