import { Kafka, Producer, logLevel } from 'kafkajs';

export interface FormPopulationCompletedEvent {
  formId: string;
  patientId: string;
  wegovyOutput: Array<{
    question_id: string;
    question_text: string;
    answer: string | number | boolean | string[];
  }>;
  timestamp: string;
}

export class KafkaProducer {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor(brokers: string[] = ['localhost:9094']) {
    this.kafka = new Kafka({
      clientId: 'form-auto-population-e2e-test',
      brokers,
      logLevel: logLevel.WARN, // Reduce noise in tests
      connectionTimeout: 10000,
      requestTimeout: 10000,
    });
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.producer.connect();
      this.isConnected = true;
      console.log('📨 Kafka producer connected');
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('📨 Kafka producer disconnected');
    }
  }

  async publishFormPopulationCompleted(
    event: FormPopulationCompletedEvent
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Producer not connected. Call connect() first.');
    }

    const message = {
      topic: 'form.population.completed',
      messages: [
        {
          key: `${event.formId}-${event.patientId}`,
          value: JSON.stringify(event),
          headers: {
            eventType: 'form.population.completed',
            formId: event.formId,
            patientId: event.patientId,
            timestamp: event.timestamp,
          },
        },
      ],
    };

    await this.producer.send(message);
    console.log(
      `📨 Published form.population.completed event for ${event.formId}/${event.patientId}`
    );
  }
}
