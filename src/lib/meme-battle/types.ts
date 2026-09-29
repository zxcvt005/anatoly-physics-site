export type MemeEventPhase = 'scheduled' | 'active' | 'ended';

export type MemeImageCard = {
  id: string;
  url: string;
  createdAt: string;
};

export type MemeRankingEntry = {
  id: string;
  url: string;
  totalVotes: number;
  firstPlaceCount: number;
  secondPlaceCount: number;
  thirdPlaceCount: number;
  totalPoints: number;
  averagePoints: number;
  authorFirstName: string | null;
};

export type MemeBattleOverview = {
  serverNow: string;
  event: {
    name: string;
    tagline: string;
    description: string;
    startsAt: string;
    endsAt: string;
    phase: MemeEventPhase;
    maxImages: number;
  };
  myImages: MemeImageCard[];
  ratingsGiven: number;
  roundsCompleted: number;
  activeImageCount: number;
  collage: { id: string; url: string }[];
  ranking: MemeRankingEntry[];
};

export type AdminMemeImage = {
  id: string;
  url: string | null;
  createdAt: string;
  participationCount: number;
  totalVotes: number;
  averagePoints: number;
  isActive: boolean;
};

export type AdminMemeStudentGroup = {
  studentId: string;
  name: string;
  activeCount: number;
  maxImages: number;
  images: AdminMemeImage[];
};

export type MemeRoundPayload = {
  roundId: string;
  roundNumber: number;
  images: { id: string; url: string }[];
};

export type MemePlacement = {
  imageId: string;
  place: number;
};
