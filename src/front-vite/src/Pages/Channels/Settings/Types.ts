import { ChannelMember, ChannelType } from "../../../Providers/ChannelContext/Channel";

export type ChannelDataType = {
  image: File | undefined;
  type: ChannelType | undefined;
};

export interface SettingsBoxType {
  membership: ChannelMember | undefined;
}

