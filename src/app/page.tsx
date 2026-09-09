import { env } from "~/env";
import { AstaraHomePage } from "~/ui/AstaraHomePage";

export default function Home() {
  return <AstaraHomePage mapStyleUrl={env.NEXT_PUBLIC_MAP_STYLE_URL} />;
}
