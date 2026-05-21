import StitchEmailSettings from "@/src/components/owner/stitch/StitchEmailSettings";
import StitchAdminManagement from "@/src/components/owner/stitch/StitchAdminManagement";
import StitchProfileSettings from "@/src/components/owner/stitch/StitchProfileSettings";

export default function OwnerSettingsPage() {
    return (
        <div className="max-w-[1600px] mx-auto p-4 sm:p-8 space-y-12">
            <StitchProfileSettings />
            <StitchAdminManagement />
            <StitchEmailSettings />
        </div>
    );
}
