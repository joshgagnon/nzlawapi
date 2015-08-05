
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" >

    <xsl:template match="bill">
        <div class="legislation">
            <div>
                <div class="bill top-level">
                     <xsl:attribute name="id">
                        <xsl:value-of select="@id"/>
                    </xsl:attribute>
                    <xsl:call-template name="current"/>
                    <xsl:apply-templates select="billref|billdetail|cover|front|body|schedule.group|end|explnote"/>
                </div>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="sop">
        <div class="legislation">
            <div>
                <div class="sop top-level">
                     <xsl:attribute name="id">
                        <xsl:value-of select="@id"/>
                    </xsl:attribute>

                <p class="sop-number">
                    No <xsl:value-of select="@sop.no"/>
                </p>
                <!-- TODO, switch here -->
                <p class="house">
                    House of Representatives
                </p>
                <h1 class="sop-heading">
                    Supplementary Order Paper
                </h1>
                <xsl:apply-templates  />
                </div>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="bill/cover">
        <div  class="cover">
            <xsl:apply-templates  />
            <p class="bill-identifier"><xsl:value-of select="../@bill.no"/>-<xsl:value-of select="../@stage"/></p>
        </div>
    </xsl:template>

    <xsl:template match="bill/cover/member">
        <p class="member"><xsl:apply-templates  /></p>
    </xsl:template>

    <xsl:template match="bill/cover/title">
        <h1 class="title"><xsl:apply-templates  /></h1>
    </xsl:template>

    <xsl:template match="bill/cover/billtype">
        <p class="billtype"><xsl:apply-templates /></p>
    </xsl:template>



    <xsl:template match="bill.sop.body/bill">
        <xsl:apply-templates  />
    </xsl:template>

    <xsl:template match="bill.sop.body/bill/billdetail">

    </xsl:template>

    <xsl:template match="sop.amend">
        <div class="sop-amend">
                 <xsl:attribute name="id">
                    <xsl:value-of select="@id"/>
                </xsl:attribute>
            <p class="clause-ref"><xsl:value-of select="clause.ref"/></p>
            <xsl:apply-templates select="sop.para"/>

        </div>
    </xsl:template>

    <xsl:template match="sop/date">
            <p class="sop-date"><xsl:apply-templates/></p>
    </xsl:template>



    <xsl:template match="billref">
        <p class="billref"><xsl:value-of select="."/></p>
    </xsl:template>

    <xsl:template match="sop/billref">
        <p class="billref"><xsl:value-of select="."/></p>
         <hr class="sop-body" />
    </xsl:template>

    <xsl:template match="bill.sop.body/heading">
        <h2 class="sop-body">
            <xsl:apply-templates />
        </h2>
    </xsl:template>

    <xsl:template match="sop/body/heading">

        <h2 class="sop-body"><xsl:value-of select="."/></h2>
    </xsl:template>

    <xsl:template match="motion">
        <p class="motion"><xsl:apply-templates /></p>
    </xsl:template>


    <xsl:template match="billdetail">
        <div class="billdetail">
            <xsl:if test="@data-hook!=''">
                <xsl:attribute name="data-hook">
                    <xsl:value-of select="@data-hook"/>
                </xsl:attribute>
                <xsl:attribute name="data-hook-length">
                    <xsl:value-of select="@data-hook-length"/>
                </xsl:attribute>
            </xsl:if>
            <h1 class="title"><xsl:value-of select="title"/></h1>
            <p class="billtype"><xsl:value-of select="billtype"/></p>
            <p class="bill-identifier"><xsl:value-of select="../@bill.no"/>-<xsl:value-of select="../@stage"/></p>
            <xsl:apply-templates select="explnote"/>
        </div>
    </xsl:template>

    <xsl:template match="explnote">
        <div class="explnote">
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <xsl:apply-templates />
            <hr class="explnote"/>
         </div>
    </xsl:template>

    <xsl:template match="explnote/heading">
             <h2 class="explnote"><xsl:apply-templates /></h2>
    </xsl:template>

    <xsl:template match="explnote.part">
        <h2 class="explnote-part">
            <xsl:if test="label!='' ">
                <span class="label"><xsl:if test="not(contains(label, 'Part'))">Part </xsl:if><xsl:value-of select="label"/></span>
            </xsl:if>
            <xsl:value-of select="heading"/>
        </h2>
        <xsl:apply-templates />
    </xsl:template>

    <xsl:template match="explnote.part/label|explnote.part/heading">
    </xsl:template>

    <xsl:template match="explnote.group">
         <xsl:apply-templates />
    </xsl:template>

    <xsl:template match="explnote.group/heading">
          <h3 class="explnote-group"><xsl:apply-templates /></h3>
    </xsl:template>


      <xsl:template match="explnote.subhead1">
         <h5 class="explnote-subhead1">
             <xsl:apply-templates />
         </h5>
    </xsl:template>



</xsl:stylesheet>