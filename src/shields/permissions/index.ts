(() => {
  if (!navigator.permissions) return;

  try {
    const origQuery = navigator.permissions.query.bind(navigator.permissions);

    navigator.permissions.query = async function (desc: PermissionDescriptor) {
      const name = desc.name;

      // Return 'prompt' for sensitive permissions (hides actual state)
      const sensitivePermissions = [
        "camera",
        "microphone",
        "geolocation",
        "notifications",
        "midi",
        "clipboard-read",
        "clipboard-write",
        "idle-detection",
        "storage-access",
        "display-capture",
      ];

      if (sensitivePermissions.includes(name)) {
        return {
          name,
          state: "prompt" as PermissionState,
          onchange: null,
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return true;
          },
        } as PermissionStatus;
      }

      // Let persistent-storage report 'granted' (common default)
      if (name === "persistent-storage") {
        return {
          name,
          state: "granted" as PermissionState,
          onchange: null,
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return true;
          },
        } as PermissionStatus;
      }

      return origQuery(desc);
    };
  } catch (_) {}
})();
