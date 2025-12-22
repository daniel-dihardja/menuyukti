"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function CreateBranchForm() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Branch</CardTitle>
      </CardHeader>

      <CardContent>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Branch name</Label>
            <Input id="name" name="name" placeholder="Berlin Mitte" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" placeholder="berlin-mitte" required />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit">Create branch</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
