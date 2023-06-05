import ListItemButton from "@mui/material/ListItemButton";
import Skeleton from "@mui/material/Skeleton";

interface Props {
  repeat?: number;
}
function TransationSummarySkeleton({ repeat }: Props) {
  return (
    <>
      {Array(repeat)
        .fill(1)
        .map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <ListItemButton key={i}>
            <Skeleton
              variant="circular"
              width={40}
              height={40}
              className=" mr-4"
            />
            <Skeleton className=" w-full h-10" />
          </ListItemButton>
        ))}
    </>
  );
}

TransationSummarySkeleton.defaultProps = {
  repeat: 1,
};

export default TransationSummarySkeleton;
