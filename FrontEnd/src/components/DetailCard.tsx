import { Card, CardContent, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface DetailCardProps {
  title: string;
  children: ReactNode;
}

export const DetailCard = ({ title, children }: DetailCardProps) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {children}
    </CardContent>
  </Card>
);
