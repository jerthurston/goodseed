'use client';

interface HowItWorkSectionProps { 
    title: string;
    description: string;
    steps: {
        title: string;
        description: string;
    }[];
}

const HowItWorkSection = ({ title, description, steps }: HowItWorkSectionProps) => {
    return (
        <section className="how-it-works">
            <div className="section-title">
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
            <div className="steps">
                <div className="step">
                    <div className="step-number">1</div>
                    <h3>{steps[0].title}</h3>
                    <p className="my-4">{steps[0].description}</p>
                </div>
                <div className="step">
                    <div className="step-number">2</div>
                    <h3>{steps[1].title}</h3>
                    <p className="my-4">{steps[1].description}</p>
                </div>
                <div className="step">
                    <div className="step-number">3</div>
                    <h3>{steps[2].title}</h3>
                    <p className="my-4">{steps[2].description}</p>
                </div>
            </div>
        </section>
    )
}

export default HowItWorkSection
