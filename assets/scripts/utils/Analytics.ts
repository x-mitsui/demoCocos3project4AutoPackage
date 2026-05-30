import { Logger } from "./logger";

function isAvailable() {
    return typeof (window as any).ALPlayableAnalytics != "undefined";
}

export const Analytics = {
    trackEvent(event: string, properties?: Record<string, any>) {
        if (!isAvailable()) return;
        (window as any).ALPlayableAnalytics.trackEvent(event, properties);
    },
    trackLoading() {
        this.trackEvent("LOADING");
    },
    trackLoaded() {
        this.trackEvent("LOADED");
    },
    trackDisplayed() {
        console.log("Analytics:trackDisplayed");
        this.trackEvent("DISPLAYED");
    },
    trackChallengeStarted() {
        this.trackEvent("CHALLENGE_STARTED");
    },
    trackChallengePass25() {
        Logger.info("Analytics:trackChallengePass25");
        this.trackEvent("CHALLENGE_PASS_25");
    },
    trackChallengePass50() {
        Logger.info("Analytics:trackChallengePass50");
        this.trackEvent("CHALLENGE_PASS_50");
    },
    trackChallengePass75() {
        Logger.info("Analytics:trackChallengePass75");
        this.trackEvent("CHALLENGE_PASS_75");
    },
    trackChallengeSolved() {
        Logger.info("Analytics:trackChallengeSolved");
        this.trackEvent("CHALLENGE_SOLVED");
    },
    trackChallengeFailed() {
        this.trackEvent("CHALLENGE_FAILED");
    },
    trackChallengeRetry() {
        this.trackEvent("CHALLENGE_RETRY");
    },
    trackCompleted() {
        this.trackEvent("COMPLETED");
    },
    trackCtaClicked() {
        this.trackEvent("CTA_CLICKED");
    },
    trackEndcardShown() {
        this.trackEvent("ENDCARD_SHOWN");
    },
};
