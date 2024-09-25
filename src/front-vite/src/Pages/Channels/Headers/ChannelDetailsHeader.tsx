import { Box, IconButton, Stack, styled, Typography, useMediaQuery, useTheme } from "@mui/material";
import { ButtonAvatar, ClickTypography, HeaderIconButton, SearchBar } from "../Components/Components";
import { useChannel } from "../../../Providers/ChannelContext/Channel";
import {
	ModeEdit as EditIcon,
  EditOff as EditOffIcon,
  Check as ApplyIcon,
	Menu as ShowChannelLineIcon,
	MenuOpen as HideChannelLineIcon,
	Chat as ReturnToChatIcon,
} from '@mui/icons-material';
import { ChannelStates } from "../../../Providers/ChannelContext/Types";

interface IChannelDetailsHeaderType {
	isMod: boolean;
	editMode: boolean;
	onApplyClick: () => void;
	onEditClick: () => void;
}

const DetailHeaderPart = styled(Stack)(({ theme }) => ({
	flexDirection: 'row',
	width: 'fit-content',
	backgroundColor: theme.palette.primary.main,
	borderBottom: `1px solid ${theme.palette.secondary.dark}`,
	alignItems: 'center',
	justifyContent: 'space-between',
	gap: theme.spacing(1),
	padding: theme.spacing(2),
}));

export const ChannelDetailsHeader: React.FC<IChannelDetailsHeaderType> = ({
	isMod,
	editMode,
	onApplyClick,
	onEditClick,
}) => {
	const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('xs'));

	const { channelProps, channelLineProps, changeProps, changeLineProps } = useChannel();

	const channel = channelProps.selected?.channel;
	if (!channel) return;

	return (
		<Stack
			direction='row'
			sx={{
					height: '65px',
					justifyContent: 'space-between',
			}}
		>
			<DetailHeaderPart
				sx={{
					borderRight: `1px solid ${theme.palette.secondary.dark}`,
					borderBottomRightRadius: '2em',
					paddingRight: theme.spacing(4),
				}}
			>
				<Stack flexDirection={'row'} gap={1} >
					<HeaderIconButton
						label={!channelLineProps.hidden ? "Hide channels" : "Show channels"}
						Icon={!channelLineProps.hidden ? HideChannelLineIcon : ShowChannelLineIcon}
						onClick={() => changeLineProps({ hidden: !channelLineProps.hidden })}
					/>
					<HeaderIconButton
						Icon={ReturnToChatIcon}
						label="Return to chat"
						iconFontSize="24px"
						onClick={() => changeProps({ state: ChannelStates.chat })}
					/>
				</Stack>
			</DetailHeaderPart>
			<DetailHeaderPart
				visibility={isMod ? 'visible' : 'hidden'}
				sx={{
					borderLeft: `1px solid ${theme.palette.secondary.dark}`,
					borderBottomLeftRadius: '2em',
					paddingLeft: theme.spacing(4),
				}}
			>
				<HeaderIconButton Icon={!editMode ? EditIcon : EditOffIcon} onClick={onEditClick} />
				{editMode && <HeaderIconButton Icon={ApplyIcon} onClick={onApplyClick} />}
			</DetailHeaderPart>
		</Stack>
	);
}
