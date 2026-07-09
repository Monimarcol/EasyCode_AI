export interface PatchChange {
    type: "replace" | "insert_before" | "insert_after" | "delete";
    old: string;
    new: string;
}

export interface PatchPayload {
    changes: PatchChange[];
}

export function validatePatch(
    patch: PatchPayload
): PatchPayload {

    const seen = new Set<string>();
    const validChanges: PatchChange[] = [];

    for (const change of patch.changes) {

        if (
            !change.type ||
            typeof change.old !== "string" ||
            typeof change.new !== "string"
        ) {
            continue;
        }

        const key =
            `${change.type}::${change.old.trim()}::${change.new.trim()}`;

        if (seen.has(key)) {
            continue;
        }

        if (
            change.type === "replace" &&
            change.old.trim() === change.new.trim()
        ) {
            continue;
        }

        if (
            change.new.includes("# Add") ||
            change.new.includes("# Ensure") ||
            change.new.includes("PATCH_START") ||
            change.new.includes("PATCH_END")
        ) {
            continue;
        }

        seen.add(key);
        validChanges.push(change);
    }

    return {
        changes: validChanges
    };
}

export function sortPatchChanges(
    patch: PatchPayload
): PatchPayload {

    const priority: Record<PatchChange["type"], number> = {
        insert_before: 1,
        insert_after: 2,
        replace: 3,
        delete: 4
    };

    return {
        changes: [...patch.changes].sort(
            (a, b) => priority[a.type] - priority[b.type]
        )
    };
}