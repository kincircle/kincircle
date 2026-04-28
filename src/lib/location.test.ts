import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateWeightedMidpoint,
  haversineDistance,
  estimateDriveTime,
  calculateLocationSuggestion,
} from "./location";

describe("location utilities", () => {
  describe("calculateWeightedMidpoint", () => {
    it("returns null for empty array", () => {
      const result = calculateWeightedMidpoint([]);
      expect(result).toBeNull();
    });

    it("returns single household location for array of one", () => {
      const households = [
        {
          lat: 40.7128,
          lng: -74.006,
          partySize: 4,
          householdId: "h1",
          primaryContactName: "John",
        },
      ];

      const result = calculateWeightedMidpoint(households);
      expect(result).toEqual({ lat: 40.7128, lng: -74.006 });
    });

    it("calculates weighted midpoint for multiple households", () => {
      const households = [
        {
          lat: 40.7128,
          lng: -74.006,
          partySize: 2,
          householdId: "h1",
          primaryContactName: "NYC Family",
        },
        {
          lat: 34.0522,
          lng: -118.2437,
          partySize: 4,
          householdId: "h2",
          primaryContactName: "LA Family",
        },
      ];

      const result = calculateWeightedMidpoint(households);
      expect(result).not.toBeNull();

      // Weighted calculation: (2*40.7128 + 4*34.0522)/6 = 36.2726
      // Weighted calculation: (2*-74.006 + 4*-118.2437)/6 = -103.4978
      expect(result!.lat).toBeCloseTo(36.2726, 2);
      expect(result!.lng).toBeCloseTo(-103.4978, 2);
    });

    it("handles households with different party sizes", () => {
      const households = [
        {
          lat: 30,
          lng: -90,
          partySize: 1,
          householdId: "h1",
          primaryContactName: "Small",
        },
        {
          lat: 40,
          lng: -100,
          partySize: 9,
          householdId: "h2",
          primaryContactName: "Large",
        },
      ];

      const result = calculateWeightedMidpoint(households);
      expect(result).not.toBeNull();

      // Should be weighted heavily toward the larger party
      // (1*30 + 9*40)/10 = 39
      // (1*-90 + 9*-100)/10 = -99
      expect(result!.lat).toBeCloseTo(39, 2);
      expect(result!.lng).toBeCloseTo(-99, 2);
    });

    it("returns null when total weight is zero", () => {
      const households = [
        {
          lat: 40,
          lng: -100,
          partySize: 0,
          householdId: "h1",
          primaryContactName: "Zero",
        },
      ];

      const result = calculateWeightedMidpoint(households);
      expect(result).toBeNull();
    });
  });

  describe("haversineDistance", () => {
    it("calculates distance between NYC and LA", () => {
      // NYC: 40.7128° N, 74.0060° W
      // LA: 34.0522° N, 118.2437° W
      const distance = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);

      // Expected distance is approximately 2451 miles
      expect(distance).toBeGreaterThan(2400);
      expect(distance).toBeLessThan(2500);
    });

    it("calculates distance between NYC and Chicago", () => {
      // NYC: 40.7128° N, 74.0060° W
      // Chicago: 41.8781° N, 87.6298° W
      const distance = haversineDistance(40.7128, -74.006, 41.8781, -87.6298);

      // Expected distance is approximately 713 miles
      expect(distance).toBeGreaterThan(700);
      expect(distance).toBeLessThan(750);
    });

    it("returns 0 for same location", () => {
      const distance = haversineDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(distance).toBeCloseTo(0, 1);
    });

    it("calculates short distances accurately", () => {
      // Two points 1 degree apart at equator (approximately 69 miles)
      const distance = haversineDistance(0, 0, 0, 1);
      expect(distance).toBeGreaterThan(60);
      expect(distance).toBeLessThan(75);
    });
  });

  describe("estimateDriveTime", () => {
    it("estimates drive time for known distances", () => {
      // 100 miles: (100 * 1.3) / 55 ≈ 2.36 hours
      const time100 = estimateDriveTime(100);
      expect(time100).toBeCloseTo(2.36, 1);
    });

    it("estimates drive time for short distances", () => {
      // 10 miles: (10 * 1.3) / 55 ≈ 0.236 hours
      const time10 = estimateDriveTime(10);
      expect(time10).toBeCloseTo(0.236, 2);
    });

    it("estimates drive time for long distances", () => {
      // 500 miles: (500 * 1.3) / 55 ≈ 11.82 hours
      const time500 = estimateDriveTime(500);
      expect(time500).toBeCloseTo(11.82, 1);
    });

    it("returns 0 for 0 distance", () => {
      const time = estimateDriveTime(0);
      expect(time).toBe(0);
    });
  });

  describe("calculateLocationSuggestion", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns null for empty array", async () => {
      const result = await calculateLocationSuggestion([]);
      expect(result).toBeNull();
    });

    it("calculates suggestion with center and distances", async () => {
      // Mock the reverseGeocode function
      vi.doMock("@/lib/geocode", () => ({
        reverseGeocode: vi.fn(() => Promise.resolve("Kansas City, MO")),
      }));

      const households = [
        {
          lat: 40.7128,
          lng: -74.006,
          partySize: 2,
          householdId: "h1",
          primaryContactName: "NYC Family",
        },
        {
          lat: 34.0522,
          lng: -118.2437,
          partySize: 2,
          householdId: "h2",
          primaryContactName: "LA Family",
        },
      ];

      const result = await calculateLocationSuggestion(households);

      expect(result).not.toBeNull();
      expect(result!.centerLat).toBeCloseTo(37.3825, 2);
      expect(result!.centerLng).toBeCloseTo(-96.1249, 2);
      expect(result!.centerName).toBe("Kansas City, MO");
      expect(result!.households).toHaveLength(2);

      // Check household distance fields
      expect(result!.households[0]).toHaveProperty("householdId");
      expect(result!.households[0]).toHaveProperty("primaryContactName");
      expect(result!.households[0]).toHaveProperty("distanceMiles");
      expect(result!.households[0]).toHaveProperty("estimatedDriveHours");
    });

    it("handles null centerName from reverseGeocode", async () => {
      vi.doMock("@/lib/geocode", () => ({
        reverseGeocode: vi.fn(() => Promise.resolve(null)),
      }));

      const households = [
        {
          lat: 40,
          lng: -100,
          partySize: 3,
          householdId: "h1",
          primaryContactName: "Family 1",
        },
      ];

      const result = await calculateLocationSuggestion(households);

      expect(result).not.toBeNull();
      expect(result!.centerName).toBeNull();
    });

    it("rounds distance and drive time appropriately", async () => {
      vi.doMock("@/lib/geocode", () => ({
        reverseGeocode: vi.fn(() => Promise.resolve("Center Point")),
      }));

      const households = [
        {
          lat: 40,
          lng: -100,
          partySize: 1,
          householdId: "h1",
          primaryContactName: "Family 1",
        },
        {
          lat: 40.5,
          lng: -100.5,
          partySize: 1,
          householdId: "h2",
          primaryContactName: "Family 2",
        },
      ];

      const result = await calculateLocationSuggestion(households);

      expect(result).not.toBeNull();
      // Distance should be rounded to whole number
      expect(Number.isInteger(result!.households[0].distanceMiles)).toBe(true);
      // Drive time should be rounded to 1 decimal
      expect(result!.households[0].estimatedDriveHours.toString()).toMatch(/^\d+\.\d$/);
    });

    it("calculates center correctly for weighted households", async () => {
      vi.doMock("@/lib/geocode", () => ({
        reverseGeocode: vi.fn(() => Promise.resolve("Weighted Center")),
      }));

      const households = [
        {
          lat: 30,
          lng: -90,
          partySize: 1,
          householdId: "h1",
          primaryContactName: "Small Family",
        },
        {
          lat: 40,
          lng: -100,
          partySize: 9,
          householdId: "h2",
          primaryContactName: "Large Family",
        },
      ];

      const result = await calculateLocationSuggestion(households);

      expect(result).not.toBeNull();
      // Center should be weighted toward the larger party
      expect(result!.centerLat).toBeCloseTo(39, 0);
      expect(result!.centerLng).toBeCloseTo(-99, 0);
    });

    it("includes all household details in response", async () => {
      vi.doMock("@/lib/geocode", () => ({
        reverseGeocode: vi.fn(() => Promise.resolve("Test City")),
      }));

      const households = [
        {
          lat: 40,
          lng: -100,
          partySize: 3,
          householdId: "household-123",
          primaryContactName: "John Smith",
        },
      ];

      const result = await calculateLocationSuggestion(households);

      expect(result).not.toBeNull();
      expect(result!.households[0].householdId).toBe("household-123");
      expect(result!.households[0].primaryContactName).toBe("John Smith");
    });
  });
});
