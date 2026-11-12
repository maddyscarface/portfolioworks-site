/**
 * Photo library. Every image is free-licensed stock (Pexels License) used for ILLUSTRATION ONLY.
 * None of these photos show PortfolioWorks projects, staff or clients — never caption them as our work.
 * Full source/licence log: public/photos/manifest.json. Swap `src` for real project photos when available.
 */
export interface Photo { src: string; width: number; height: number; alt: string; credit: string; sourceUrl: string }

export const photos = {
  heroRentReadyLivingRoom: { src: "/photos/hero-rent-ready-living-room.jpg", width: 1600, height: 1066, alt: "Bright, empty living room with hardwood floor and large windows", credit: "Curtis Adams / Pexels", sourceUrl: "https://www.pexels.com/photo/an-empty-living-room-with-hardwood-flooring-7027844/" },
  rentReadyOpenPlan: { src: "/photos/rent-ready-open-plan.jpg", width: 1600, height: 1067, alt: "Empty apartment with open kitchen and hardwood floors", credit: "Curtis Adams / Pexels", sourceUrl: "https://www.pexels.com/photo/empty-living-room-in-apartment-10827192/" },
  flooringInstall: { src: "/photos/flooring-install.jpg", width: 1600, height: 1066, alt: "Installer laying wood-look plank flooring", credit: "K / Pexels", sourceUrl: "https://www.pexels.com/photo/crop-man-installing-laminate-flooring-4263067/" },
  flooringCutting: { src: "/photos/flooring-cutting.jpg", width: 1600, height: 1066, alt: "Worker measuring and cutting flooring panels", credit: "Jimmy Nilsson Masth / Pexels", sourceUrl: "https://www.pexels.com/photo/man-cutting-plywood-on-floor-11427401/" },
  wallPlastering: { src: "/photos/wall-plastering.jpg", width: 1600, height: 1066, alt: "Worker skim-coating an interior wall", credit: "Antoni Shkraba / Pexels", sourceUrl: "https://www.pexels.com/photo/man-in-white-t-shirt-wearing-white-gas-mask-using-flat-metal-spatula-on-the-wall-5493652/" },
  wallRepair: { src: "/photos/wall-repair.jpg", width: 1600, height: 1066, alt: "Worker repairing an interior wall", credit: "Antoni Shkraba / Pexels", sourceUrl: "https://www.pexels.com/photo/a-man-fixing-the-wall-4981812/" },
  kitchenRenovated: { src: "/photos/kitchen-renovated.jpg", width: 1600, height: 1200, alt: "Renovated kitchen with white cabinets and hardwood floors", credit: "Peter Vang / Pexels", sourceUrl: "https://www.pexels.com/photo/modern-renovated-kitchen-with-hardwood-floors-37357024/" },
  kitchenBoston: { src: "/photos/kitchen-boston.jpg", width: 1600, height: 1066, alt: "Apartment kitchen in Boston with mosaic backsplash", credit: "Chris Palladino (37visuals.com) / Pexels", sourceUrl: "https://www.pexels.com/photo/modern-boston-kitchen-interior-with-mosaic-backsplash-38661234/" },
  bathroomVanity: { src: "/photos/bathroom-vanity.jpg", width: 1600, height: 1200, alt: "Bathroom with marble-look tile and white vanity", credit: "Pexels contributor (credited on source page) / Pexels", sourceUrl: "https://www.pexels.com/photo/modern-bathroom-with-marble-tile-and-vanity-35493890/" },
  bostonNorthEnd: { src: "/photos/boston-north-end.jpg", width: 1600, height: 1103, alt: "Red-brick buildings on Hanover Street, Boston North End", credit: "Juliana \u00c7upa / Pexels", sourceUrl: "https://www.pexels.com/photo/people-on-hanover-street-in-boston-north-end-usa-18425705/" },
  bostonBrickApartments: { src: "/photos/boston-brick-apartments.jpg", width: 1200, height: 1600, alt: "Red-brick apartment building in Boston", credit: "Teju / Pexels", sourceUrl: "https://www.pexels.com/photo/elegant-brick-apartment-building-against-blue-sky-39490808/" },
  bostonBrickStreet: { src: "/photos/boston-brick-street.jpg", width: 1200, height: 1600, alt: "Boston street with historic brick buildings", credit: "Teju / Pexels", sourceUrl: "https://www.pexels.com/photo/scenic-view-of-boston-s-brick-architecture-36202486/" },
  inspectionChecklist: { src: "/photos/inspection-checklist.jpg", width: 1600, height: 1066, alt: "Inspector holding a checklist during a property walk", credit: "Kindel Media / Pexels", sourceUrl: "https://www.pexels.com/photo/person-in-yellow-reflective-safety-vest-holding-a-pen-and-checklist-of-house-inspection-8293680/" },
  siteWalkthrough: { src: "/photos/site-walkthrough.jpg", width: 1600, height: 1066, alt: "Contractor walking a client through an interior", credit: "Pexels contributor (credited on source page) / Pexels", sourceUrl: "https://www.pexels.com/photo/a-woman-in-hard-hat-showing-the-house-to-the-man-in-long-sleeves-8469989/" },
  measuringDetail: { src: "/photos/measuring-detail.jpg", width: 1600, height: 1010, alt: "Measuring tape on a workbench", credit: "Pexels contributor (credited on source page) / Pexels", sourceUrl: "https://www.pexels.com/photo/crop-man-using-measuring-tape-in-workshop-5973888/" },
  scopePlanning: { src: "/photos/scope-planning.jpg", width: 1600, height: 1068, alt: "Floor plans beside a laptop", credit: "Pexels contributor (credited on source page) / Pexels", sourceUrl: "https://www.pexels.com/photo/white-printer-paper-on-macbook-pro-4458198/" },
  painterRoller: { src: "/photos/painter-roller.jpg", width: 1069, height: 1600, alt: "Painter rolling white paint on an apartment wall", credit: "Ksenia Chernaya / Pexels", sourceUrl: "https://www.pexels.com/photo/crop-faceless-painter-rolling-walls-in-light-apartment-5691694/" },
  painterWall: { src: "/photos/painter-wall.jpg", width: 1066, height: 1600, alt: "Painter rolling a wall in a room under renovation", credit: "Tima Miroshnichenko / Pexels", sourceUrl: "https://www.pexels.com/photo/man-in-blue-denim-jeans-holding-black-and-yellow-paint-roller-6474480/" },
  drywallBathroom: { src: "/photos/drywall-bathroom.jpg", width: 1066, height: 1600, alt: "Drywall finishing in a bathroom renovation", credit: "Pexels contributor (credited on source page) / Pexels", sourceUrl: "https://www.pexels.com/photo/home-renovation-man-installing-drywall-in-bathroom-38076239/" },
  livingRoomGreen: { src: "/photos/living-room-green.jpg", width: 1600, height: 1066, alt: "Empty living room with hardwood floor and tall windows", credit: "Curtis Adams / Pexels", sourceUrl: "https://www.pexels.com/photo/empty-living-room-with-wooden-floor-and-green-walls-5353938/" },
} satisfies Record<string, Photo>;
export type PhotoKey = keyof typeof photos;

/** Art direction: which illustrative photo leads each service page / card. */
export const SERVICE_PHOTO: Record<string, PhotoKey> = {
  "rental-turnovers": "livingRoomGreen",
  "painting-drywall": "painterRoller",
  flooring: "flooringInstall",
  "bathroom-remodeling": "bathroomVanity",
  "kitchen-remodeling": "kitchenRenovated",
  carpentry: "measuringDetail",
  "exterior-repairs": "bostonBrickStreet",
  "plumbing-electrical-hvac-coordination": "drywallBathroom",
  "full-rehab": "wallPlastering",
  "capital-improvements": "bostonBrickApartments",
  "property-maintenance": "inspectionChecklist",
};
export const servicePhoto = (slug: string): PhotoKey => SERVICE_PHOTO[slug] ?? "rentReadyOpenPlan";

/** Market art direction. Boston imagery is used ONLY for Massachusetts; other markets get neutral interiors. */
export const MARKET_PHOTO: Record<string, PhotoKey> = { massachusetts: "bostonNorthEnd", florida: "rentReadyOpenPlan", maine: "livingRoomGreen" };
export const marketPhoto = (id: string): PhotoKey => MARKET_PHOTO[id] ?? "heroRentReadyLivingRoom";
