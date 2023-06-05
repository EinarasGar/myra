import Avatar from "@mui/material/Avatar";
import Icon from "@mui/material/Icon";
import Skeleton from "@mui/material/Skeleton";
import { useGetCategoriesQuery } from "@/app/myraApi";

interface CateogryAvatarProps {
  categoryId: number | null | undefined;
}

function CateogryAvatar({ categoryId }: CateogryAvatarProps) {
  const { data, isLoading } = useGetCategoriesQuery();
  if (isLoading)
    return (
      <Skeleton variant="circular" width={40} height={40} className=" mr-4" />
    );

  const iconModel = data?.find((x) => x.id === categoryId);
  const icon = iconModel?.icon ?? "question_mark";

  return (
    <Avatar>
      <Icon>{icon}</Icon>
    </Avatar>
  );
}

export default CateogryAvatar;
