import { Construct } from 'constructs';
import { CfnVpcLink } from './apigateway.generated';
import * as elbv2 from '../../aws-elasticloadbalancingv2';
import { IResource, Lazy, Names, Resource } from '../../core';
import { addConstructMetadata, MethodMetadata } from '../../core/lib/metadata-resource';
import { propertyInjectable } from '../../core/lib/prop-injectable';

/**
 * Represents an API Gateway VpcLink
 */
export interface IVpcLink extends IResource {
  /**
   * Physical ID of the VpcLink resource
   * @attribute
   */
  readonly vpcLinkId: string;
}

/**
 * Properties for a VpcLink
 */
export interface VpcLinkProps {
  /**
   * The name used to label and identify the VPC link.
   * @default - automatically generated name
   */
  readonly vpcLinkName?: string;

  /**
   * The description of the VPC link.
   * @default no description
   */
  readonly description?: string;

  /**
   * The network load balancers of the VPC targeted by the VPC link.
   * The network load balancers must be owned by the same AWS account of the API owner.
   *
   * @default - no targets. Use `addTargets` to add targets
   */
  readonly targets?: elbv2.INetworkLoadBalancer[];
}

/**
 * Define a new VPC Link
 * Specifies an API Gateway VPC link for a RestApi to access resources in an Amazon Virtual Private Cloud (VPC).
 */
@propertyInjectable
export class VpcLink extends Resource implements IVpcLink {
  /** Uniquely identifies this class. */
  public static readonly PROPERTY_INJECTION_ID: string = 'aws-cdk-lib.aws-apigateway.VpcLink';

  /**
   * Import a VPC Link by its Id
   */
  public static fromVpcLinkId(scope: Construct, id: string, vpcLinkId: string): IVpcLink {
    class Import extends Resource implements IVpcLink {
      public vpcLinkId = vpcLinkId;
    }

    return new Import(scope, id);
  }

  /**
   * Physical ID of the VpcLink resource
   * @attribute
   */
  public readonly vpcLinkId: string;

  private readonly _targets = new Array<elbv2.INetworkLoadBalancer>();

  constructor(scope: Construct, id: string, props: VpcLinkProps = {}) {
    super(scope, id, {
      physicalName: props.vpcLinkName ||
        Lazy.string({ produce: () => Names.nodeUniqueId(this.node) }),
    });
    // Enhanced CDK Analytics Telemetry
    addConstructMetadata(this, props);

    const cfnResource = new CfnVpcLink(this, 'Resource', {
      name: this.physicalName,
      description: props.description,
      targetArns: Lazy.list({ produce: () => this.renderTargets() }),
    });

    this.vpcLinkId = cfnResource.ref;

    if (props.targets) {
      this.addTargets(...props.targets);
    }

    this.node.addValidation({ validate: () => this.validateVpcLink() });
  }

  @MethodMetadata()
  public addTargets(...targets: elbv2.INetworkLoadBalancer[]) {
    this._targets.push(...targets);
  }

  /**
   * Return the list of DNS names from the target NLBs.
   * @internal
   * */
  public get _targetDnsNames(): string[] {
    return this._targets.map(t => t.loadBalancerDnsName);
  }

  private validateVpcLink(): string[] {
    if (this._targets.length === 0) {
      return ['No targets added to vpc link'];
    }
    return [];
  }

  private renderTargets() {
    return this._targets.map(nlb => nlb.loadBalancerArn);
  }
}
