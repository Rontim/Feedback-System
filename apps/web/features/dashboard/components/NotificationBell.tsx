"use client";

import { BellOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Divider, Flex, List, Popover, Typography, notification } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { markAllNotificationsRead, markNotificationRead } from "../api";
import { timeAgo } from "../format";
import { queryKeys, useNotifications } from "../queries";
import type { NotificationDto } from "../types";

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [toast, toastHolder] = notification.useNotification();
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const previousUnread = useRef<number | null>(null);

  // A new unread alert since the last poll raises a toast so reps notice it without watching the page.
  useEffect(() => {
    if (!data) return;
    if (previousUnread.current !== null && data.unread_count > previousUnread.current) {
      const newest = data.results[0];
      toast.warning({
        message: "New detractor alert",
        description: newest ? `${newest.customer_name || "A customer"} scored ${newest.mean}/5` : undefined,
        placement: "bottomRight",
      });
    }
    previousUnread.current = data.unread_count;
  }, [data, toast]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
  const readAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });
  const readOne = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });

  const openNotification = (item: NotificationDto): void => {
    if (!item.read_at) readOne.mutate(item.id);
    setOpen(false);
    router.push("/dashboard/alerts");
  };

  const content = (
    <Flex vertical style={{ width: 320 }}>
      <Flex justify="space-between" align="center">
        <Typography.Text strong>Notifications</Typography.Text>
        <Button
          size="small"
          type="link"
          loading={readAll.isPending}
          disabled={!data || data.unread_count === 0}
          onClick={() => readAll.mutate()}
        >
          Mark all read
        </Button>
      </Flex>
      <Divider style={{ margin: "8px 0" }} />
      <List<NotificationDto>
        size="small"
        locale={{ emptyText: "No notifications" }}
        dataSource={data?.results ?? []}
        renderItem={(item) => (
          <List.Item
            style={{ cursor: "pointer" }}
            onClick={() => openNotification(item)}
            extra={<Typography.Text type="secondary">{timeAgo(item.created_at)}</Typography.Text>}
          >
            <Typography.Text strong={!item.read_at}>
              {item.customer_name || "Customer"} scored {item.mean}/5
            </Typography.Text>
          </List.Item>
        )}
      />
    </Flex>
  );

  return (
    <>
      {toastHolder}
      <Popover content={content} trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen}>
        <Badge count={data?.unread_count ?? 0} size="small" overflowCount={99}>
          <Button type="text" icon={<BellOutlined />} aria-label="Notifications" />
        </Badge>
      </Popover>
    </>
  );
}
