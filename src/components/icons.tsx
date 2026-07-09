"use client";

// antd icons use React context and must live behind a client boundary.
// Server components import icons from here so they render as client refs.
export {
  InboxOutlined,
  FlagOutlined,
  UserOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
