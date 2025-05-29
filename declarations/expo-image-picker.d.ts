declare module "expo-image-picker" {
  export type MediaTypeOptions = "Images" | "Videos" | "All";

  export type PermissionResponse = {
    status: "granted" | "denied";
  };

  export function requestMediaLibraryPermissionsAsync(): Promise<PermissionResponse>;

  export type ImagePickerOptions = {
    mediaTypes?: MediaTypeOptions;
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  };

  export type ImagePickerResult = {
    canceled: boolean;
    assets?: { uri: string }[];
  };

  export function launchImageLibraryAsync(
    options?: ImagePickerOptions
  ): Promise<ImagePickerResult>;
}
