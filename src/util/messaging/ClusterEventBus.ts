import type { Serializable } from 'child_process';
import cluster, { worker } from 'cluster';
import type { ClusterManager } from '../../init/cluster/ClusterManager';
import type { Initializable } from '../../init/Initializable';
import { getLoggerFor } from '../../logging/LogUtil';
import type { EventBus, EventConsumer, EventSubscription } from './EventBus';

interface ClusterMessage<T extends Serializable> {
  workerSourceId?: number;
  address: string;
  body: T;
}

export class ClusterEventBus<T extends Serializable> implements EventBus<T>, Initializable {
  private readonly logger = getLoggerFor(this);
  private readonly clusterManager: ClusterManager;
  private readonly subscriptions: Set<EventSubscription<T>> = new Set([]);

  public constructor(clusterManager: ClusterManager) {
    this.clusterManager = clusterManager;
  }

  public async publish(address: string, event: T): Promise<void> {
    if (this.clusterManager.isSingleThreaded()) {
      await this.distribute({ address, body: event });
    } else {
      worker.send({
        workerSourceId: cluster.worker.id,
        address,
        body: event,
      });
    }
  }

  public async subscribe(address: string, consumer: EventConsumer<T>): Promise<EventSubscription<T>> {
    const subscriptionRef = this.subscriptions;
    const newSubscription = {
      address,
      consumer,
      async unsubscribe(): Promise<void> {
        subscriptionRef.delete(this);
      },
    } as EventSubscription<T>;
    this.subscriptions.add(newSubscription);
    return newSubscription;
  }

  public async initialize(): Promise<void> {
    if (!this.clusterManager.isSingleThreaded()) {
      if (cluster.isMaster) {
        cluster.on('message', (msg: string): void => {
          const message: ClusterMessage<T> = { ...JSON.parse(msg) };
          for (const [ , clusterWorker ] of Object.entries(cluster.workers)) {
            if (clusterWorker?.id !== message.workerSourceId) {
              clusterWorker?.send(msg);
            }
          }
        });
      }

      if (cluster.isWorker) {
        worker.on('message', (msg: string): void => {
          this.distribute({ ...JSON.parse(msg) })
            .then()
            .catch((error): void => {
              this.logger.warn(`Unexpected error while distributing event: ${error.message}.`);
            });
        });
      }
    }
  }

  private async distribute(message: ClusterMessage<T>): Promise<void> {
    for (const subscription of this.subscriptions) {
      if (subscription.address === message.address) {
        await subscription.consumer.onEvent(message.body);
      }
    }
  }
}
