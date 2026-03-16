"use client";

import { api } from "@ShiftSync/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@ShiftSync/ui/components/button";
import { Input } from "@ShiftSync/ui/components/input";
import { Label } from "@ShiftSync/ui/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ShiftSync/ui/components/card";
import { MapPin, Globe, Plus, Building2 } from "lucide-react";

export default function AdminLocationsPage() {
  const locations = useQuery(api.locations.listLocations, {});
  const createLocation = useMutation(api.locations.createLocation);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createLocation({
        name,
        address,
        timezone,
      });
      toast.success("Location created successfully");
      setName("");
      setAddress("");
      setTimezone("America/New_York");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create location";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (locations === undefined) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Location Management
        </h1>
        <p className="text-sm text-muted-foreground">
          View and create operational locations across the organization.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_400px]">
        {/* Locations List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Locations ({locations.length})
          </h2>

          {locations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No locations found. Create one to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {locations.map((loc) => (
                <Card key={loc._id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      {loc.name}
                      <span className="text-xs font-normal text-muted-foreground">
                        Since {format(loc._creationTime, "MMM yyyy")}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{loc.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4 shrink-0" />
                      <span>{loc.timezone}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create Form */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-lg">Create Location</CardTitle>
              <CardDescription>
                Add a new restaurant or store location.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Downtown Cafe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St, City, ST"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">IANA Timezone</Label>
                  <Input
                    id="timezone"
                    placeholder="America/New_York"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: Area/Location (e.g. Europe/London)
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Creating..." : "Create Location"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
